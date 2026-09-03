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

        const systemPrompt = `You are AI Life Assistant, a professional, intelligent, and helpful AI assistant.

Provide answers that are clear, well-organized, and easy to understand on mobile devices.

Use short paragraphs.

Use headings, numbered lists, or bullet points when they improve readability.

Avoid large walls of text.

Default to moderate-length answers.

For simple questions, answer directly and briefly.

For complex questions, organize the answer clearly without unnecessary repetition.

When analyzing an image:
- Describe what you can actually see.
- Do not invent details.
- Answer the user's specific question.
- Mention uncertainty when something is unclear.
- Keep the response natural and professional.`;


        // ======================================
        // BUILD MESSAGES
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
                        "Describe this image."
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
                ? "meta-llama/llama-4-scout-17b-16e-instruct"
                : "openai/gpt-oss-20b";


        console.log(
            image
                ? "🖼️ Vision request"
                : "💬 Text request"
        );


        // ======================================
        // CALL GROQ
        // ======================================

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
                        JSON.stringify({

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

                            max_tokens: 500

                        })

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
        // GET AI RESPONSE
        // ======================================

        const reply =
            data?.choices?.[0]?.message?.content;


        if (!reply) {

            console.error(
                "❌ Groq returned no text:",
                data
            );


            return res.status(500).json({

                error:
                    "Groq returned no AI response"

            });

        }


        // ======================================
        // SUCCESS
        // ======================================

        console.log(
            "✅ Groq AI responded successfully"
        );


        return res.status(200).json({

            success: true,

            reply:
                String(reply).trim()

        });

    }

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
