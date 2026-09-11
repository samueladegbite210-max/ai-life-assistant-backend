"use strict";

module.exports = async function handler(req, res) {

    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type");

    if (req.method === "OPTIONS") {
        return res.status(200).end();
    }

    if (req.method !== "POST") {
        return res.status(405).json({
            error: "Method not allowed"
        });
    }

    try {

        const body = req.body || {};

        const message =
            String(body.message || "").trim();

        const image =
            body.image || null;

        if (!message && !image) {
            return res.status(400).json({
                error: "Message or image is required"
            });
        }

        const apiKey =
            process.env.GROQ_API_KEY;

        if (!apiKey) {

            console.error(
                "❌ GROQ_API_KEY is missing"
            );

            return res.status(500).json({
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

Answer the user's actual question directly.

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

When an image is provided:

- Actually inspect the image.
- Describe only what you can see.
- Do not invent details.
- Answer the user's specific question.
- If the user asks what is in the image, describe it clearly.
- If the user asks about text in the image, read the visible text.
- If something is unclear, say so.
- Do not mention technical limitations unless there is a real error.

Do not use Markdown tables unless the user specifically asks for one.
`;


        /* =====================================================
           USER CONTENT
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
                        url: image
                    }
                }

            ];

        } else {

            userContent =
                message;

        }


        /* =====================================================
           MODEL
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


        /* =====================================================
           GROQ REQUEST
        ===================================================== */

        const requestBody = {

            model: model,

            messages: [

                {
                    role: "system",
                    content: systemPrompt
                },

                {
                    role: "user",
                    content: userContent
                }

            ],

            temperature:
                image ? 0.7 : 0.5,

            max_completion_tokens: 800

        };


        /* =====================================================
           REASONING SETTINGS
        ===================================================== */

        if (model === "openai/gpt-oss-20b") {

            requestBody.include_reasoning = false;

        }


        if (model === "qwen/qwen3.6-27b") {

            // Keep vision responses in normal
            // non-thinking mode.

            requestBody.reasoning_effort =
                "none";

        }


        /* =====================================================
           CALL GROQ
        ===================================================== */

        const response =
            await fetch(
                "https://api.groq.com/openai/v1/chat/completions",
                {
                    method: "POST",

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

            return res.status(
                response.status
            ).json({

                error:
                    data?.error?.message ||
                    "Groq AI request failed"

            });

        }


        /* =====================================================
           GET FINAL ANSWER
        ===================================================== */

        let reply =
            data?.choices?.[0]?.message?.content;


        /*
         * Extra safety:
         * If Groq somehow returns reasoning
         * inside content, remove it.
         */

        if (typeof reply === "string") {

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

            return res.status(500).json({

                error:
                    "Groq returned no AI response"

            });

        }


        console.log(
            "✅ Groq final answer returned"
        );


        /* =====================================================
           SUCCESS
        ===================================================== */

        return res.status(200).json({

            success: true,

            reply:
                String(reply).trim()

        });


    } catch (error) {

        console.error(
            "❌ BACKEND ERROR:",
            error
        );

        return res.status(500).json({

            error:
                "Internal server error"

        });

    }

};
