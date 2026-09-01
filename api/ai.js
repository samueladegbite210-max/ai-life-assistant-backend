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
    // PREFLIGHT
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
        // READ REQUEST
        // ======================================

        const body =
            req.body || {};

        const message =
            String(
                body.message || ""
            ).trim();


        if (!message) {

            return res.status(400).json({

                error:
                    "Message is required"

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
                    "Server AI key is not configured"

            });

        }


        // ======================================
        // CALL GROQ
        // ======================================

        console.log(
            "🌐 Sending request to Groq..."
        );


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

                            model:
                                "llama-3.3-70b-versatile",

                            messages: [

                                {
                                    role:
                                        "system",

                                    content:
                                        "You are AI Life Assistant, a helpful, friendly and intelligent personal AI assistant. Answer the user's question clearly and naturally."
                                },

                                {
                                    role:
                                        "user",

                                    content:
                                        message
                                }

                            ],

                            temperature:
                                0.7,

                            max_tokens:
                                1000

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
        // GROQ ERROR
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
        // EXTRACT REPLY
        // ======================================

        const reply =
            data?.choices?.[0]?.message?.content;


        if (!reply) {

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
            "❌ Backend error:",
            error
        );


        return res.status(500).json({

            error:
                "Internal server error"

        });

    }

};
