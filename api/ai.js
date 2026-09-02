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
        // GET MESSAGE
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
                    "Groq API key is not configured"

            });

        }


        console.log(
            "🟢 GROQ API KEY FOUND"
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

                            model:
                                "openai/gpt-oss-20b",

                            messages: [

                                
                                    {
    role: "system",

    content: `You are AI Life Assistant, a professional, intelligent, and helpful AI assistant.

IMPORTANT RESPONSE LENGTH RULE:

Your default answers MUST be MODERATE in length.

Normally answer in approximately 2 to 5 short paragraphs.

For simple questions:
Give a concise answer of 1 to 3 paragraphs.

For normal questions:
Give a clear, moderate explanation without excessive detail.

For complex questions:
Give a useful summary first, then explain the important points.

DO NOT write long essays unless the user specifically asks for:
"explain in detail"
"give me a detailed answer"
"tell me everything"
"write extensively"

Do not over-explain simple questions.
Do not add unnecessary information.
Do not repeat the same point.

RESPONSE STYLE:

- Be professional and natural.
- Answer the question directly.
- Be intelligent, clear, and helpful.
- Keep responses balanced: not too short and not too long.
- Use short paragraphs for mobile readability.
- Use bullet points only when helpful.
- Give examples only when necessary.
- Avoid unnecessary introductions.
- Avoid filler sentences.
- Adapt naturally to the user's question.

FORMATTING:

- Do not use Markdown tables.
- Do not use ASCII tables.
- Do not use pipe characters for formatting.
- Keep formatting clean and simple.

Think like a modern professional AI assistant.
Your answers should feel similar to ChatGPT: clear, balanced, intelligent, and appropriately detailed.`
            },

                

                           {
                                    role:
                                        "user",

                                    content:
                                        message
                                }

                            ],

                            temperature:
                              0.5,

                            max_tokens:
                               400

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
        // EXTRACT RESPONSE
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

            success:
                true,

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
