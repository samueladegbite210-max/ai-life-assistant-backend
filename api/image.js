// api/image.js

export default async function handler(req, res) {

    // -----------------------------
    // CORS
    // -----------------------------

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


    if (req.method === "OPTIONS") {
        return res.status(200).end();
    }


    if (req.method !== "POST") {

        return res.status(405).json({
            error: "Method not allowed"
        });

    }


    try {

        const {
            prompt,
            image
        } = req.body || {};


        // -----------------------------
        // Validate prompt
        // -----------------------------

        if (
            !prompt ||
            typeof prompt !== "string"
        ) {

            return res.status(400).json({
                error: "Image prompt is required"
            });

        }


        // -----------------------------
        // Hugging Face token
        // -----------------------------

        const token =
            process.env.HUGGINGFACE_API_KEY;


        if (!token) {

            return res.status(500).json({
                error:
                    "HUGGINGFACE_API_KEY is not configured in Vercel."
            });

        }


        // -----------------------------
        // Choose operation
        // -----------------------------

        const isEdit =
            Boolean(image);


        /*
         * Text-to-image:
         *
         * Qwen Image
         *
         * Image-to-image:
         *
         * FLUX Kontext
         */

        const model = isEdit

            ? "black-forest-labs/FLUX.1-Kontext-dev"

            : "Qwen/Qwen-Image";


        const endpoint =
            "https://router.huggingface.co/hf-inference/models/"
            + model;


        // -----------------------------
        // Build request
        // -----------------------------

        let body;


        if (isEdit) {

            /*
             * image should be a data URL:
             *
             * data:image/jpeg;base64,...
             */

            const base64Image =
                image.includes(",")
                    ? image.split(",")[1]
                    : image;


            const binary =
                Buffer.from(
                    base64Image,
                    "base64"
                );


            body = binary;

        } else {

            body = JSON.stringify({
                inputs: prompt
            });

        }


        const headers = {

            Authorization:
                `Bearer ${token}`

        };


        if (!isEdit) {

            headers[
                "Content-Type"
            ] = "application/json";

        } else {

            headers[
                "Content-Type"
            ] = "application/octet-stream";

        }


        // -----------------------------
        // Call Hugging Face
        // -----------------------------

        const response =
            await fetch(
                endpoint,
                {
                    method: "POST",
                    headers,
                    body
                }
            );


        if (!response.ok) {

            const errorText =
                await response.text();


            console.error(
                "Hugging Face error:",
                response.status,
                errorText
            );


            return res.status(
                response.status
            ).json({

                error:
                    "Image engine request failed.",

                details:
                    errorText

            });

        }


        // -----------------------------
        // Convert generated image
        // to base64
        // -----------------------------

        const buffer =
            Buffer.from(
                await response.arrayBuffer()
            );


        const contentType =
            response.headers.get(
                "content-type"
            ) ||
            "image/png";


        const imageData =
            `data:${contentType};base64,`
            +
            buffer.toString("base64");


        // -----------------------------
        // Return image
        // -----------------------------

        return res.status(200).json({

            success: true,

            type: "image",

            operation:
                isEdit
                    ? "edit"
                    : "generate",

            image:
                imageData,

            prompt

        });


    } catch (error) {

        console.error(
            "Image engine error:",
            error
        );


        return res.status(500).json({

            error:
                "Image engine failed.",

            details:
                error.message

        });

    }

}
