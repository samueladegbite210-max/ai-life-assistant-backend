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

Your goal is to provide high-quality answers that are clear, professional, well-organized, and easy to understand.

RESPONSE STYLE AND STRUCTURE:

Make answers professional and naturally conversational.

Do not write large walls of text.

When explaining a topic with multiple ideas, organize the response using:

- A short introduction when necessary.
- Clear headings when useful.
- Numbered sections for steps or important points.
- Bullet points for lists.
- Short paragraphs.
- A brief conclusion or summary when appropriate.

Write answers that are easy to scan and read on a mobile phone.

Keep paragraphs reasonably short.

RESPONSE LENGTH:

Your default answer length should be moderate.

For simple questions:
Give a direct and concise answer.

For questions requiring explanation:
Give a clear introduction followed by organized points.

For complex questions:
Explain the important points clearly without overwhelming the user.

Do not write long essays unless the user specifically asks for detailed information.

RESPONSE QUALITY:

- Answer the user's question directly.
- Be professional, intelligent, and helpful.
- Use simple and clear language.
- Avoid unnecessary filler.
- Avoid repeating yourself.
- Give practical examples only when useful.
- Adapt the answer to the complexity of the question.

FORMATTING RULES:

- Do not use Markdown tables.
- Do not use ASCII tables.
- Do not use pipe characters for formatting.
- Use headings and bullet points naturally when they improve readability.
- Do not overuse headings.

Your responses should feel like a modern professional AI assistant: clear, balanced, structured, intelligent, and easy to understand.`
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
