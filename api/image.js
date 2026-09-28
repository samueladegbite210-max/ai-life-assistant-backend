import { InferenceClient } from "@huggingface/inference";

export default async function handler(req, res) {
    if (req.method !== "POST") {
        return res.status(405).json({
            success: false,
            error: "Method not allowed"
        });
    }

    try {
        const token = process.env.HUGGINGFACE_API_KEY;

        if (!token) {
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

        const client = new InferenceClient(token);

        let imageBlob;
        let operation;

        if (image) {

            console.log("🎨 IMAGE EDIT");
            console.log("Model: Qwen/Qwen-Image-Edit");

            imageBlob = await client.imageToImage({
                provider: "fal-ai",
                model: "Qwen/Qwen-Image-Edit",
                inputs: image,
                prompt: prompt.trim()
            });

            operation = "edit";

        } else {

            console.log("🎨 IMAGE GENERATION");
            console.log("Model: Qwen/Qwen-Image");

            imageBlob = await client.textToImage({
                provider: "fal-ai",
                model: "Qwen/Qwen-Image",
                inputs: prompt.trim()
            });

            operation = "generate";
        }

        if (!imageBlob) {
            throw new Error(
                "Hugging Face returned no image."
            );
        }

        const buffer =
            Buffer.from(
                await imageBlob.arrayBuffer()
            );

        if (!buffer.length) {
            throw new Error(
                "Hugging Face returned an empty image."
            );
        }

        const imageData =
            `data:image/png;base64,${buffer.toString("base64")}`;

        console.log(
            "✅ Image received:",
            buffer.length,
            "bytes"
        );

        return res.status(200).json({
            success: true,
            type: "image",
            operation,
            image: imageData,
            prompt: prompt.trim()
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
