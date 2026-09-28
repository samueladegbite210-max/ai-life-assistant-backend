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

        const { prompt, image } = req.body || {};

        if (!prompt) {
            return res.status(400).json({
                success: false,
                error: "Image prompt is required."
            });
        }

        const isEdit = Boolean(image);

        const model = isEdit
            ? "Qwen/Qwen-Image-Edit"
            : "Qwen/Qwen-Image";

        const url =
            `https://router.huggingface.co/hf-inference/models/${model}`;

        const body = isEdit
            ? {
                inputs: image,
                parameters: {
                    prompt: prompt.trim()
                }
            }
            : {
                inputs: prompt.trim()
            };

        console.log("================================");
        console.log("🎨 IMAGE ENGINE");
        console.log("Model:", model);
        console.log("Edit:", isEdit);
        console.log("Prompt:", prompt);
        console.log("================================");

        const response = await fetch(url, {
            method: "POST",
            headers: {
                Authorization: `Bearer ${apiKey}`,
                "Content-Type": "application/json"
            },
            body: JSON.stringify(body)
        });

        const contentType =
            response.headers.get("content-type") || "";

        const responseBuffer =
            Buffer.from(await response.arrayBuffer());

        const responseText =
            responseBuffer.toString("utf8");

        console.log(
            "HF STATUS:",
            response.status
        );

        console.log(
            "HF CONTENT TYPE:",
            contentType
        );

        if (!response.ok) {

            console.error(
                "HF RESPONSE:",
                responseText
            );

            return res.status(502).json({
                success: false,
                error: "Hugging Face request failed.",
                status: response.status,
                details: responseText
            });
        }

        // Hugging Face may return a JSON error/loading message.
        if (
            contentType.includes("application/json") ||
            contentType.includes("text/plain")
        ) {

            console.error(
                "HF NON-IMAGE RESPONSE:",
                responseText
            );

            let details = responseText;

            try {
                details =
                    JSON.parse(responseText);
            } catch (_) {
                // Keep text response
            }

            return res.status(502).json({
                success: false,
                error:
                    "Hugging Face did not return an image.",
                details
            });
        }

        if (
            !contentType.startsWith("image/")
        ) {

            return res.status(502).json({
                success: false,
                error:
                    "Hugging Face returned an unsupported response.",
                contentType
            });
        }

        if (!responseBuffer.length) {
            return res.status(502).json({
                success: false,
                error:
                    "Hugging Face returned an empty image."
            });
        }

        const base64 =
            responseBuffer.toString("base64");

        const imageData =
            `data:${contentType};base64,${base64}`;

        console.log(
            "✅ IMAGE RECEIVED:",
            responseBuffer.length,
            "bytes"
        );

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
            "🔥 IMAGE ENGINE ERROR:",
            error
        );

        return res.status(500).json({
            success: false,
            error:
                error.message ||
                "Image engine request failed."
        });
    }
}
