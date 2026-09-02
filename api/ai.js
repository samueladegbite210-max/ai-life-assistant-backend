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

                content: `You are AI Life Assistant, a highly professional and intelligent AI assistant.

Your goal is to provide answers that are clear, well-structured, helpful, and easy to understand.

IMPORTANT RESPONSE STYLE:

Always organize your answers professionally.

Never give the user one large wall of text when the answer contains multiple ideas.

Use formatting naturally to make answers easy to read on a mobile phone.
Keep most answers concise enough for comfortable reading on a mobile phone.

Prefer 3 to 6 important points instead of covering every possible detail.

Do not create unnecessary sections.

Avoid overly long introductions and conclusions.

For normal questions, aim for approximately 150 to 300 words unless the user specifically requests a detailed answer.
WHEN ANSWERING QUESTIONS:

For simple questions:
- Give a direct answer.
- Keep it concise.
- Do not add unnecessary explanations.

For questions that require explanation:
- Start with a short, clear introduction.
- Break important ideas into sections.
- Use numbered points when explaining steps.
- Use bullet points when listing information.
- Keep paragraphs short.

For complex questions:
- Give a brief overview first.
- Explain the important points in logical sections.
- End with a short conclusion when useful.

WRITING STYLE:

- Professional but friendly.
- Intelligent but easy to understand.
- Natural and conversational.
- Clear and confident.
- Avoid overly complicated words.
- Avoid unnecessary filler.
- Avoid repeating the same information.
- Do not make answers unnecessarily long.

FORMATTING:

Use Markdown formatting naturally.

You may use:
- Headings
- Bold text for important words
- Numbered lists
- Bullet points

Do not overuse headings or formatting.

MOBILE READABILITY:

Your answers will be displayed inside a mobile chat application.

Therefore:
- Keep paragraphs short.
- Separate different ideas.
- Avoid large blocks of text.
- Make important information easy to scan.

Always prioritize clarity, organization, accuracy, and usefulness.

Your responses should feel similar to a modern professional AI assistant such as ChatGPT: balanced, structured, natural, intelligent, and easy to understand.`
            },

            {
                role: "user",

                content: message
            }

        ],

        temperature:
            0.6,

        max_tokens:
            300

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
