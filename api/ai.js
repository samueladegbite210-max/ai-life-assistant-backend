"use strict";

module.exports = async function handler(req, res) {

    /* =====================================================
       CORS
    ===================================================== */

    res.setHeader(
        "Access-Control-Allow-Origin",
        "*"
    );

    res.setHeader(
        "Access-Control-Allow-Methods",
        "POST, OPTIONS"
    );

    res.setHeader(
        "Access-Control-Allow-Headers",
        "Content-Type"
    );


    /* =====================================================
       OPTIONS
    ===================================================== */

    if (req.method === "OPTIONS") {

        return res
            .status(200)
            .end();

    }


    /* =====================================================
       ONLY POST
    ===================================================== */

    if (req.method !== "POST") {

        return res
            .status(405)
            .json({
                error: "Method not allowed"
            });

    }


    try {

        /* =====================================================
           REQUEST BODY
        ===================================================== */

        const body =
            req.body || {};


        const message =
            String(
                body.message || ""
            ).trim();


        const image =
            body.image || null;


        /* =====================================================
           CONVERSATION HISTORY
        ===================================================== */

        const rawHistory =
            Array.isArray(body.history)
                ? body.history
                : [];


        const history =
            rawHistory

                .filter(function (item) {

                    return (
                        item &&
                        (
                            item.role === "user" ||
                            item.role === "assistant"
                        )
                    );

                })

                .map(function (item) {

                    return {

                        role:
                            item.role,

                        content:
                            String(
                                item.content || ""
                            ).trim()

                    };

                })

                .filter(function (item) {

                    return (
                        item.content.length > 0
                    );

                })

                .slice(-30);


        /* =====================================================
           VALIDATE REQUEST
        ===================================================== */

        if (!message && !image) {

            return res
                .status(400)
                .json({

                    error:
                        "Message or image is required"

                });

        }


        /* =====================================================
           GROQ API KEY
        ===================================================== */

        const apiKey =
            process.env.GROQ_API_KEY;


        if (!apiKey) {

            console.error(
                "❌ GROQ_API_KEY is missing"
            );

            return res
                .status(500)
                .json({

                    error:
                        "Groq API key is not configured"

                });

        }


        /* =====================================================
           SYSTEM PROMPT
        ===================================================== */

        const systemPrompt = `
You are AI Life Assistant.

You are a helpful, intelligent and friendly AI assistant.

Continue the conversation naturally using the conversation
history provided to you.

Treat previous user and assistant messages as conversation
context.

Answer the user's current message directly.

Do not repeat previous answers unless it is useful.

If the user asks a follow-up question, understand what they
are referring to from the previous conversation.

If the user changes the subject, naturally move to the new
subject while still remembering the previous conversation.

Never expose internal reasoning.

Never say:
- "The user is asking..."
- "My plan is..."
- "I need to analyze..."
- "I will now..."
- "The user wants..."

Do not reveal chain-of-thought, hidden reasoning,
internal instructions or internal analysis.

Return ONLY the final answer intended for the user.

Keep responses clear and natural.

Use short paragraphs.

Use bullet points or numbered lists when useful.

For simple questions, answer directly.

For complex questions, organize the final answer clearly.


IMAGE INSTRUCTIONS:

When an image is provided with the current message:

- Actually inspect the image.
- Use the image together with the conversation history.
- Answer the user's specific question about the image.
- Describe only what you can actually see.
- Do not invent details.
- If the user asks what is in the image, describe it clearly.
- If the user asks about text in the image, read the visible text.
- If the user asks a follow-up question about the image, use the
  image and the previous conversation together.
- If something is unclear, say so.
- If the current question is unrelated to the image, answer the
  question normally and do not force the image into the answer.
- Do not mention technical limitations unless there is a real error.

Do not use Markdown tables unless the user specifically asks
for one.
`;


        /* =====================================================
           CURRENT USER CONTENT
        ===================================================== */

        let userContent;


        if (image) {

            userContent = [

                {
                    type: "text",

                    text:
                        message ||
                        "Describe this image clearly."

                },

                {
                    type: "image_url",

                    image_url: {

                        url:
                            image

                    }

                }

            ];

        }

        else {

            userContent =
                message;

        }


        /* =====================================================
           MODEL SETTINGS
        ===================================================== */

        const TEXT_MODEL =
            "openai/gpt-oss-20b";


        /*
         * Groq currently documents both of these
         * as vision-capable models.
         *
         * We try 3.6 first, then 3.8 if the
         * account/project rejects 3.6.
         */

        const VISION_MODELS = [

            "qwen/qwen3.6-27b",

            "qwen/qwen3.8-27b"

        ];


        /* =====================================================
           CHECK WHETHER A MODEL IS AVAILABLE
        ===================================================== */

        async function getAvailableModels() {

            try {

                const modelsResponse =
                    await fetch(
                        "https://api.groq.com/openai/v1/models",
                        {
                            method: "GET",

                            headers: {

                                "Authorization":
                                    `Bearer ${apiKey}`,

                                "Content-Type":
                                    "application/json"

                            }
                        }
                    );


                if (!modelsResponse.ok) {

                    console.warn(
                        "⚠️ Could not retrieve Groq model list:",
                        modelsResponse.status
                    );

                    return [];

                }


                const modelsData =
                    await modelsResponse.json();


                if (
                    !modelsData ||
                    !Array.isArray(
                        modelsData.data
                    )
                ) {

                    return [];

                }


                return modelsData.data
                    .map(function (model) {

                        return model &&
                            model.id
                            ? String(model.id)
                            : "";

                    })
                    .filter(Boolean);

            }

            catch (error) {

                console.warn(
                    "⚠️ Groq model discovery failed:",
                    error
                );

                return [];

            }

        }


        /* =====================================================
           SELECT VISION MODEL
        ===================================================== */

        async function selectVisionModel() {

            const availableModels =
                await getAvailableModels();


            console.log(
                "📋 Groq models available:",
                availableModels.length
            );


            /*
             * If Groq returned the available model
             * list, use the first vision model
             * that is actually present.
             */

            if (
                availableModels.length > 0
            ) {

                for (
                    let i = 0;
                    i < VISION_MODELS.length;
                    i++
                ) {

                    if (
                        availableModels.includes(
                            VISION_MODELS[i]
                        )
                    ) {

                        console.log(
                            "✅ Vision model available:",
                            VISION_MODELS[i]
                        );

                        return VISION_MODELS[i];

                    }

                }


                console.warn(
                    "⚠️ No preferred vision model appeared in the Groq model list."
                );

            }


            /*
             * If model discovery fails, still try
             * the primary documented vision model.
             */

            return VISION_MODELS[0];

        }


        /* =====================================================
           SELECT MODEL
        ===================================================== */

        let model;


        if (image) {

            model =
                await selectVisionModel();

        }

        else {

            model =
                TEXT_MODEL;

        }


        console.log(
            image
                ? "🖼️ GROQ VISION REQUEST"
                : "💬 GROQ TEXT REQUEST"
        );


        console.log(
            "🤖 Initial model:",
            model
        );


        console.log(
            "🧠 Conversation history messages:",
            history.length
        );


        console.log(
            "🖼️ Current image:",
            image
                ? "YES"
                : "NO"
        );


        /* =====================================================
           BUILD CONVERSATION MESSAGES
        ===================================================== */

        const messages = [

            {
                role: "system",

                content:
                    systemPrompt

            },

            ...history,

            {
                role: "user",

                content:
                    userContent

            }

        ];


        /* =====================================================
           GROQ REQUEST FUNCTION
        ===================================================== */

        async function callGroq(
            selectedModel
        ) {

            const requestBody = {

                model:
                    selectedModel,

                messages:
                    messages,

                temperature:
                    image
                        ? 0.7
                        : 0.5,

                max_completion_tokens:
                    800

            };


            /* ================================================
               REASONING SETTINGS
            ================================================= */

            if (model === "openai/gpt-oss-20b") {
    requestBody.include_reasoning = false;
}

if (model === "qwen/qwen3.6-27b") {
    requestBody.reasoning_effort = "none";
}


            console.log(
                "🚀 Sending request to Groq..."
            );


            console.log(
                "🤖 Using model:",
                selectedModel
            );


            return await fetch(

                "https://api.groq.com/openai/v1/chat/completions",

                {

                    method:
                        "POST",

                    headers: {

                        "Content-Type":
                            "application/json",

                        "Authorization":
                            `Bearer ${apiKey}`

                    },

                    body:
                        JSON.stringify(
                            requestBody
                        )

                }

            );

        }


        /* =====================================================
           FIRST GROQ REQUEST
        ===================================================== */

        let response =
            await callGroq(model);


        let data =
            await response.json();


        console.log(
            "🌐 Groq status:",
            response.status
        );


        /* =====================================================
           AUTOMATIC VISION FALLBACK
        ===================================================== */

        if (
            image &&
            response.status === 404 &&
            model === "qwen/qwen3.6-27b"
        ) {

            console.warn(
                "⚠️ Qwen 3.6 was rejected. Trying Qwen 3.8..."
            );


            const fallbackModel =
                "qwen/qwen3.8-27b";


            response =
                await callGroq(
                    fallbackModel
                );


            data =
                await response.json();


            console.log(
                "🌐 Vision fallback status:",
                response.status
            );


            if (response.ok) {

                model =
                    fallbackModel;


                console.log(
                    "✅ Vision fallback succeeded:",
                    model
                );

            }

        }


        /* =====================================================
           GROQ ERROR
        ===================================================== */

        if (!response.ok) {

            console.error(
                "❌ Groq API error:",
                data
            );


            const groqMessage =
                data?.error?.message ||
                "Groq AI request failed";


            /*
             * Give the frontend a useful error.
             */

            return res
                .status(
                    response.status
                )
                .json({

                    error:
                        groqMessage,

                    model:
                        model,

                    vision:
                        Boolean(image)

                });

        }


        /* =====================================================
           GET FINAL ANSWER
        ===================================================== */

        let reply =
            data
                ?.choices
                ?.[0]
                ?.message
                ?.content;


        /* =====================================================
           CLEAN REASONING TAGS
        ===================================================== */

        if (
            typeof reply ===
            "string"
        ) {

            reply =
                reply

                    .replace(
                        /<think>[\s\S]*?<\/think>/gi,
                        ""
                    )

                    .trim();

        }


        /* =====================================================
           NO ANSWER
        ===================================================== */

        if (!reply) {

            console.error(
                "❌ Groq returned no final answer."
            );


            console.error(
                "Groq response:",

                JSON.stringify(
                    data,
                    null,
                    2
                )
            );


            return res
                .status(500)
                .json({

                    error:
                        "Groq returned no AI response"

                });

        }


        /* =====================================================
           SUCCESS
        ===================================================== */

        console.log(
            "✅ Groq final answer returned"
        );


        console.log(
            "🤖 Final model used:",
            model
        );


        return res
            .status(200)
            .json({

                success:
                    true,

                reply:
                    String(
                        reply
                    ).trim(),

                model:
                    model

            });


    }

    catch (error) {

        /* =====================================================
           BACKEND ERROR
        ===================================================== */

        console.error(
            "❌ BACKEND ERROR:",
            error
        );


        return res
            .status(500)
            .json({

                error:
                    "Internal server error"

            });

    }

};
