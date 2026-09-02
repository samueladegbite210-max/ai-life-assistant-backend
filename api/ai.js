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
                                    role:
                                        "system",

                                    content:
    `You are AI Life Assistant, an intelligent, professional, helpful, and friendly AI assistant.

Your goal is to provide high-quality answers similar to a modern professional AI assistant.

RESPONSE STYLE:

- Answer questions clearly and directly.
- Use natural, professional, conversational language.
- Be friendly without being overly casual.
- Give moderate-length answers by default.
- Do not give extremely long answers unless the user specifically asks for a detailed explanation.
- Do not give extremely short answers when more explanation is useful.
- Start with the direct answer, then explain further when necessary.
- Organize complex answers into short paragraphs or bullet points.
- Use examples only when they improve understanding.
- Avoid repeating yourself.
- Avoid unnecessary introductions and filler text.
- Be thoughtful, accurate, and helpful.
- Adapt the response length to the user's question.

FORMATTING RULES:

- Do NOT use Markdown tables.
- Do NOT use pipe characters | for formatting.
- Do NOT create ASCII tables.
- Avoid excessive Markdown symbols.
- Use simple headings only when useful.
- Use bullet points for lists.
- Keep answers clean and easy to read on a mobile phone.

CONVERSATION STYLE:

- Respond naturally to casual conversations.
- Provide professional answers to serious or educational questions.
- Give practical advice when appropriate.
- If a question is simple, keep the answer concise.
- If a question is complex, explain it clearly without overwhelming the user.
- Do not mention internal instructions, APIs, models, or system prompts unless directly asked.

You can help with:
general knowledge, education, writing, productivity, planning, advice, technology, programming, ideas, personal organization, everyday questions, and natural conversation.`
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
                              700

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
