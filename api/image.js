export default async function handler(req, res) {

    // =========================================
    // CORS
    // =========================================

    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader(
        "Access-Control-Allow-Methods",
        "POST, OPTIONS"
    );
    res.setHeader(
        "Access-Control-Allow-Headers",
        "Content-Type"
    );

    // =========================================
    // PREFLIGHT
    // =========================================

    if (req.method === "OPTIONS") {
        return res.status(200).json({
            success: true
        });
    }

    // =========================================
    // POST ONLY
    // =========================================

    if (req.method !== "POST") {
        return res.status(405).json({
            success: false,
            error: "Method not allowed"
        });
    }

    try {

        // =========================================
        // API KEY
        // =========================================

        const apiKey =
            process.env.OPENAI_API_KEY;

        if (!apiKey) {
            return res.status(500).json({
                success: false,
                error:
                    "OPENAI_API_KEY is not configured in Vercel."
            });
        }

        // =========================================
        // REQUEST BODY
        // =========================================

        const {
            prompt,
            image = null
        } = req.body || {};

        if (
            !prompt ||
            typeof prompt !== "string"
        ) {
            return res.status(400).json({
                success: false,
                error: "Image prompt is required."
            });
        }

        const cleanPrompt =
            prompt.trim();

        let response;
        let operation;

        // =========================================
        // IMAGE EDIT
        // =========================================

        if (image) {

            console.log(
                "🎨 IMAGE EDIT REQUEST"
            );

            console.log(
                "Model: gpt-image-2.5-sunburst"
            );

            // -----------------------------------------
            // Convert data URL into binary
            // -----------------------------------------

            let imageBuffer;
            let mimeType = "image/png";

            if (
                typeof image === "string" &&
                image.startsWith("data:")
            ) {

                const match =
                    image.match(
                        /^data:(image\/[a-zA-Z0-9.+-]+);base64,(.+)$/
                    );

                if (!match) {
                    return res.status(400).json({
                        success: false,
                        error:
                            "Invalid image data format."
                    });
                }

                mimeType = match[1];

                imageBuffer =
                    Buffer.from(
                        match[2],
                        "base64"
                    );

            } else {

                return res.status(400).json({
                    success: false,
                    error:
                        "Image must be a base64 data URL."
                });
            }

            if (!imageBuffer.length) {
                return res.status(400).json({
                    success: false,
                    error:
                        "The supplied image is empty."
                });
            }

            // -----------------------------------------
            // OpenAI multipart request
            // -----------------------------------------

            const formData =
                new FormData();

            formData.append(
                "model",
                "gpt-image-2.5-sunburst"
            );

            formData.append(
                "prompt",
                cleanPrompt
            );

            formData.append(
                "size",
                "1024x1024"
            );

            formData.append(
                "quality",
                "medium"
            );

            formData.append(
                "output_format",
                "png"
            );

            const extension =
                mimeType === "image/jpeg"
                    ? "jpg"
                    : mimeType === "image/webp"
                        ? "webp"
                        : "png";

            const imageBlob =
                new Blob(
                    [imageBuffer],
                    {
                        type: mimeType
                    }
                );

            formData.append(
                "image",
                imageBlob,
                `input.${extension}`
            );

            response =
                await fetch(
                    "https://api.openai.com/v1/images/edits",
                    {
                        method: "POST",
                        headers: {
                            Authorization:
                                `Bearer ${apiKey}`
                        },
                        body: formData
                    }
                );

            operation = "edit";

        }

        // =========================================
        // IMAGE GENERATION
        // =========================================

        else {

            console.log(
                "🎨 IMAGE GENERATION REQUEST"
            );

            console.log(
                "Model: gpt-image-2.5-flare"
            );

            response =
                await fetch(
                    "https://api.openai.com/v1/images/generations",
                    {
                        method: "POST",
                        headers: {
                            "Content-Type":
                                "application/json",
                            Authorization:
                                `Bearer ${apiKey}`
                        },
                        body: JSON.stringify({
                            model:
                                "gpt-image-2.5-flare",

                            prompt:
                                cleanPrompt,

                            size:
                                "1024x1024",

                            quality:
                                "medium",

                            output_format:
                                "png",

                            n: 1
                        })
                    }
                );

            operation = "generate";
        }

        // =========================================
        // HANDLE OPENAI ERROR
        // =========================================

        if (!response.ok) {

            let errorData = null;

            try {
                errorData =
                    await response.json();
            } catch {
                errorData = null;
            }

            console.error(
                "❌ OPENAI IMAGE ERROR:",
                errorData
            );

            const message =
                errorData?.error?.message ||
                `OpenAI image request failed with status ${response.status}.`;

            return res.status(
                response.status >= 400 &&
                response.status < 600
                    ? response.status
                    : 500
            ).json({
                success: false,
                error: message
            });
        }

        // =========================================
        // READ RESPONSE
        // =========================================

        const result =
            await response.json();

        const imageBase64 =
            result?.data?.[0]?.b64_json;

        if (!imageBase64) {

            console.error(
                "❌ OpenAI returned no image data:",
                result
            );

            throw new Error(
                "OpenAI returned no image data."
            );
        }

        // =========================================
        // FINAL DATA URL
        // =========================================

        const imageData =
            `data:image/png;base64,${imageBase64}`;

        console.log(
            "✅ Image received successfully"
        );

        return res.status(200).json({

            success: true,

            type: "image",

            operation,

            image: imageData,

            prompt: cleanPrompt

        });

    } catch (error) {

        console.error(
            "❌ IMAGE ENGINE ERROR:",
            error
        );

        return res.status(500).json({

            success: false,

            error:
                error?.message ||
                "Image engine request failed."

        });
    }
}
