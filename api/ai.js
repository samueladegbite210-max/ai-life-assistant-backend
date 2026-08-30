"use strict";

module.exports = async function handler(req, res) {

    /*
    Allow requests from your frontend
    */

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


    /*
    Browser preflight request
    */

    if (req.method === "OPTIONS") {

        return res.status(200).end();

    }


    /*
    Only allow POST requests
    */

    if (req.method !== "POST") {

        return res.status(405).json({

            error:
                "Method not allowed"

        });

    }


    try {

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


        /*
        Check API key
        */

        const apiKey =
            process.env.OPENAI_API_KEY;


        if (!apiKey) {

            console.error(
                "OPENAI_API_KEY is missing"
            );


            return res.status(500).json({

                error:
                    "Server AI key is not configured"

            });

        }


        /*
        Call OpenAI
        */

        const response =
            await fetch(
                "https://api.openai.com/v1/responses",
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
                        JSON.stringify({

                            model:
                                "gpt-4.1-mini",

                            input:
                                message

                        })

                }
            );


        const data =
            await response.json();


        /*
        Handle OpenAI errors
        */

        if (!response.ok) {

            console.error(
                "OpenAI API error:",
                data
            );


            return res.status(
                response.status
            ).json({

                error:
                    data?.error?.message ||
                    "AI request failed"

            });

        }


        /*
        Extract AI response text
        */

        let reply = "";


        if (
            data.output_text
        ) {

            reply =
                data.output_text;

        }

        else {

            reply =
                "I received your message, but no text reply was returned.";

        }


        /*
        Return to your frontend
        */

        return res.status(200).json({

            success: true,

            reply:
                reply

        });

    }

    catch (error) {

        console.error(
            "Backend error:",
            error
        );


        return res.status(500).json({

            error:
                "Internal server error"

        });

    }

};
