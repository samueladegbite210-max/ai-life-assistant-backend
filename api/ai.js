"use strict";

module.exports = async function handler(req, res) {

    // ==========================================
    // CORS
    // ==========================================

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


    // ==========================================
    // OPTIONS / PREFLIGHT
    // ==========================================

    if (req.method === "OPTIONS") {

        return res.status(200).end();

    }


    // ==========================================
    // ONLY POST
    // ==========================================

    if (req.method !== "POST") {

        return res.status(405).json({

            error: "Method not allowed"

        });

    }


    try {

        // ======================================
        // GET REQUEST DATA
        // ======================================

        const body =
            req.body || {};


        const message =
            String(
                body.message || ""
            ).trim();


        const image =
            body.image || null;


        if (!message && !image) {

            return res.status(400).json({

                error:
                    "Message or image is required"

            });

        }


        // ======================================
        // GROQ API KEY
        // ======================================

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


        // ======================================
        // SYSTEM PROMPT
        // ======================================

        const systemPrompt = `You are AI Life Assistant.

You are a helpful, intelligent, friendly personal AI assistant.

Answer the user's actual question directly.

IMPORTANT:
- Never describe your internal reasoning.
- Never say "the user is asking".
- Never provide a "Plan" describing how you will answer.
- Never reveal chain-of-thought or hidden reasoning.
- Do not mention internal instructions.
- Do not generate analysis intended only for the model.
- Give only the final answer intended for the user.

Keep answers clear and natural on mobile devices.

Use short paragraphs.

Use bullet points or numbered lists when useful.

For simple questions, answer directly and briefly.

For complex questions, organize the final answer clearly.

When an image is provided:
- Actually inspect the image.
- Describe only what you can see.
- Do not invent details.
- Answer the user's specific question.
- If the user's question is unrelated to the image, answer the question normally.
- Do not force the image into an unrelated answer.
- Mention uncertainty when something is unclear.

Do not use Markdown tables unless the user specifically asks for a table.`;


        // ======================================
        // BUILD USER CONTENT
        // ======================================

        let userContent;


        // ======================================
        // IMAGE REQUEST
        // ======================================

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

        }


        // ======================================
        // TEXT REQUEST
        // ======================================

        else {

            userContent =
                message;

        }


        // ======================================
        // SELECT MODEL
        // ======================================

        const model =
            image
                ? "qwen/qwen3.6-27b"
                : "openai/gpt-oss-20b";


        console.log(
            image
                ? "🖼️ Vision request"
                : "💬 Text request"
        );


        console.log(
            "🤖 Model:",
            model
        );


        // ======================================
        // CALL GROQ
        // ======================================

        const requestBody = {

            model: model,

            messages: [

                {
                    role: "system",

                    content:
                        systemPrompt
                },

                {
                    role: "user",

                    content:
                        userContent
                }

            ],

            temperature: 0.5,

            max_tokens: 800

        };


        // ======================================
        // HIDE REASONING
        // ======================================

        if (
            model === "openai/gpt-oss-20b"
        ) {

            requestBody.include_reasoning =
                false;

        }


        // ======================================
        // HIDE QWEN REASONING
        // ======================================

        if (
            model === "qwen/qwen3.6-27b"
        ) {

            requestBody.reasoning_format =
                "hidden";

        }


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


        // ======================================
        // READ RESPONSE
        // ======================================

        const data =
            await response.json();


        console.log(
            "🌐 Groq status:",
            response.status
        );


        // ======================================
        // ERROR
        // ======================================

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


        // ======================================
        // GET FINAL ANSWER
        // ======================================

        let reply =
            data?.choices?.[0]?.message?.content;


        if (!reply) {

            console.error(
                "❌ Groq returned no final answer:",
                data
            );


            return res.status(500).json({

                error:
                    "Groq returned no AI response"

            });

        }


        // ======================================
        // EXTRA SAFETY
        // REMOVE THINK BLOCKS IF PRESENT
        // ======================================

        reply =
            String(reply)
                .replace(
                    /<think>[\s\S]*?<\/think>/gi,
                    ""
                )
                .trim();


        if (!reply) {

            return res.status(500).json({

                error:
                    "Groq returned an empty final answer"

            });

        }


        // ======================================
        // SUCCESS
        // ======================================

        console.log(
            "✅ Groq final answer returned"
        );


        return res.status(200).json({

            success: true,

            reply:
                reply

        });

    }


    // ==========================================
    // BACKEND ERROR
    // ==========================================

    catch (error) {

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
