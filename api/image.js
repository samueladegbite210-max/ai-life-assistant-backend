export default async function handler(req, res) {
    if (req.method !== "POST") {
        return res.status(405).json({
            success: false,
            error: "Method not allowed"
        });
    }

    try {
        const apiKey = process.env.HUGGINGFACE_API_KEY;

        if (!apiKey) {
            return res.status(500).json({
                success: false,
                error: "HUGGINGFACE_API_KEY is not configured in Vercel."
            });
        }

        const {
            prompt,
            image = null
        } = req.body || {};

        if (!prompt || typeof prompt !== "string") {
            return res.status(400).json({
                success: false,
                error: "Image prompt is required."
            });
        }

        const isEdit = Boolean(image);

        const model = isEdit
            ? "Qwen/Qwen-Image-Edit"
            : "Qwen/Qwen-Image";

        const endpoint =
            `https://router.huggingface.co/hf-inference/models/${model}`;

        let requestBody;

        if (isEdit) {
            requestBody = {
                inputs: image,
                parameters: {
                    prompt: prompt.trim()
                }
            };
        } else {
            requestBody = {
                inputs: prompt.trim()
            };
        }

        console.log("🎨 Image request");
        console.log("Model:", model);
        console.log("Edit:", isEdit);
        console.log("Prompt:", prompt);

        const response = await fetch(endpoint, {
            method: "POST",

            headers: {
                "Authorization": `Bearer ${apiKey}`,
                "Content-Type": "application/json"
            },

            body: JSON.stringify(requestBody)
        });

        const contentType =
            response.headers.get("content-type") || "";

        if (!response.ok) {

            const errorText =
                await response.text();

            console.error(
                "❌ Hugging Face error:",
                response.status,
                errorText
            );

            return res.status(502).json({
                success: false,
                error: "Hugging Face image request failed.",
                status: response.status,
                details: errorText
            });
        }

        let imageBuffer;

        if (contentType.includes("application/json")) {

            const data =
                await response.json();

            console.log(
                "HF JSON response:",
                data
            );

            if (data.error) {
                return res.status(502).json({
                    success: false,
                    error: data.error
                });
            }

            return res.status(502).json({
                success: false,
                error: "Hugging Face returned JSON instead of an image.",
                details: data
            });
        }

        imageBuffer =
            Buffer.from(
                await response.arrayBuffer()
            );

        if (!imageBuffer.length) {
            return res.status(502).json({
                success: false,
                error: "Hugging Face returned an empty image."
            });
        }

        const mimeType =
            contentType.startsWith("image/")
                ? contentType
                : "image/png";

        const base64 =
            imageBuffer.toString("base64");

        const imageData =
            `data:${mimeType};base64,${base64}`;

        return res.status(200).json({
            success: true,
            type: "image",
            operation: isEdit
                ? "edit"
                : "generate",
            image: imageData,
            prompt: prompt.trim()
        });

    } catch (error) {

        console.error(
            "❌ Image engine exception:",
            error
        );

        return res.status(500).json({
            success: false,
            error: "Image engine request failed.",
            details:
                error.message ||
                String(error)
        });
    }
}
