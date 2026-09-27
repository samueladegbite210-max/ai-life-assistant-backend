// api/image.js

export default async function handler(req, res) {

    // --------------------------------
    // CORS
    // --------------------------------

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


    // --------------------------------
    // OPTIONS
    // --------------------------------

    if (req.method === "OPTIONS") {
        return res.status(200).end();
    }


    // --------------------------------
    // POST ONLY
    // --------------------------------

    if (req.method !== "POST") {

        return res.status(405).json({
            success: false,
            error: "Method not allowed"
        });

    }


    try {

        const body =
            req.body || {};


        const prompt =
            typeof body.prompt === "string"
                ? body.prompt.trim()
                : "";


        const image =
            typeof body.image === "string"
                ? body.image.trim()
                : "";


        // --------------------------------
        // VALIDATE PROMPT
        // --------------------------------

        if (!prompt) {

            return res.status(400).json({

                success: false,

                error:
                    "Image prompt is required."

            });

        }


        // --------------------------------
        // HUGGING FACE TOKEN
        // --------------------------------

        const token =
            process.env.HUGGINGFACE_API_KEY;


        if (!token) {

            return res.status(500).json({

                success: false,

                error:
                    "HUGGINGFACE_API_KEY is not configured in Vercel."

            });

        }


        // --------------------------------
        // DETERMINE OPERATION
        // --------------------------------

        const isEdit =
            Boolean(image);


        // --------------------------------
        // MODELS
        // --------------------------------

        const model =
            isEdit

                ? "Qwen/Qwen-Image-Edit"

                : "Qwen/Qwen-Image";


        const endpoint =
            "https://router.huggingface.co/hf-inference/models/"
            + model;


        // --------------------------------
        // HEADERS
        // --------------------------------

        const headers = {

            Authorization:
                `Bearer ${token}`,

            "Content-Type":
                "application/json"

        };


        // --------------------------------
        // BUILD PAYLOAD
        // --------------------------------

        let payload;


        if (!isEdit) {

            /*
             * TEXT → IMAGE
             */

            payload = {

                inputs:
                    prompt

            };

        } else {

            /*
             * IMAGE → IMAGE
             *
             * Remove data URL prefix if present.
             */

            const base64Image =
                image.includes(",")

                    ? image.split(",")[1]

                    : image;


            payload = {

                inputs:
                    base64Image,

                parameters: {

                    prompt:
                        prompt

                }

            };

        }


        // --------------------------------
        // CALL HUGGING FACE
        // --------------------------------

        const response =
            await fetch(
                endpoint,
                {
                    method: "POST",

                    headers:

                        headers,

                    body:
                        JSON.stringify(
                            payload
                        )

                }
            );


        // --------------------------------
        // HANDLE ERROR
        // --------------------------------

        if (!response.ok) {

            const errorText =
                await response.text();


            console.error(
                "Hugging Face image error:",
                response.status,
                errorText
            );


            return res.status(
                response.status
            ).json({

                success: false,

                error:
                    "Image engine request failed.",

                status:
                    response.status,

                details:
                    errorText

            });

        }


        // --------------------------------
        // READ IMAGE RESULT
        // --------------------------------

        const buffer =
            Buffer.from(
                await response.arrayBuffer()
            );


        const contentType =
            response.headers.get(
                "content-type"
            ) ||
            "image/png";


        // --------------------------------
        // CONVERT TO DATA URL
        // --------------------------------

        const imageData =

            `data:${contentType};base64,`
            +
            buffer.toString(
                "base64"
            );


        // --------------------------------
        // SUCCESS
        // --------------------------------

        return res.status(200).json({

            success: true,

            type:
                "image",

            operation:

                isEdit

                    ? "edit"

                    : "generate",

            image:
                imageData,

            prompt:
                prompt

        });


    } catch (error) {

        console.error(
            "Image engine error:",
            error
        );


        return res.status(500).json({

            success: false,

            error:
                "Image engine failed.",

            details:
                error.message

        });

    }

}
