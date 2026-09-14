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


        /*
         * Only allow normal user/assistant
         * conversation messages.
         *
         * We do NOT allow the frontend
         * to inject system messages.
         */

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

                /*
                 * Keep the most recent
                 * 30 messages.
                 *
                 * This prevents the request from
                 * growing forever.
                 */

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

        } else {

            userContent =
                message;

        }


        /* =====================================================
           SELECT MODEL
        ===================================================== */

        const model =
            image
                ? "qwen/qwen3.6-27b"
                : "openai/gpt-oss-20b";


        console.log(
            image
                ? "🖼️ GROQ VISION REQUEST"
                : "💬 GROQ TEXT REQUEST"
        );


        console.log(
            "🤖 Model:",
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

            /*
             * Previous conversation.
             *
             * These are the messages that allow
             * the AI to understand things like:
             *
             * User: Who is in the image?
             * AI: A man...
             * User: What is he wearing?
             *
             * The second question can now use
             * the conversation history.
             */

            ...history,

            /*
             * CURRENT USER MESSAGE
             */

            {
                role: "user",

                content:
                    userContent

            }

        ];


        /* =====================================================
           GROQ REQUEST BODY
        ===================================================== */

        const requestBody = {

            model:
                model,

            messages:
                messages,

            temperature:
                image
                    ? 0.7
                    : 0.5,

            max_completion_tokens:
                800

        };


        /* =====================================================
           REASONING SETTINGS
        ===================================================== */

        if (
            model ===
            "openai/gpt-oss-20b"
        ) {

            requestBody.include_reasoning =
                false;

        }


        if (
            model ===
            "qwen/qwen3.6-27b"
        ) {

            /*
             * Keep reasoning hidden from
             * the user.
             */

            requestBody.reasoning_format =
                "hidden";

        }


        /* =====================================================
           CALL GROQ
        ===================================================== */

        console.log(
            "🚀 Sending request to Groq..."
        );


        const response =
            await fetch(

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


        /* =====================================================
           READ GROQ RESPONSE
        ===================================================== */

        const data =
            await response.json();


        console.log(
            "🌐 Groq status:",
            response.status
        );


        /* =====================================================
           GROQ ERROR
        ===================================================== */

        if (!response.ok) {

            console.error(
                "❌ Groq API error:",
                data
            );


            return res
                .status(
                    response.status
                )
                .json({

                    error:
                        data?.error?.message ||
                        "Groq AI request failed"

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


        return res
            .status(200)
            .json({

                success:
                    true,

                reply:
                    String(
                        reply
                    ).trim()

            });


    } catch (error) {

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
