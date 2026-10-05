"use strict";

const {
    Document,
    Packer,
    Paragraph,
    TextRun
} = require("docx");

const {
    PDFDocument,
    StandardFonts,
    rgb
} = require("pdf-lib");


module.exports = async function handler(req, res) {

    /* =====================================================
       CORS
    ===================================================== */

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

        const body =
            req.body || {};


        const message =
            String(
                body.message || ""
            ).trim();


        const image =
            body.image || null;


        /* =================================================
           FILE CREATION REQUEST
        ================================================= */

        const createFile =
            body.createFile || null;


        /* =================================================
           FILE EDIT REQUEST
           THIS WAS MISSING BEFORE
        ================================================= */

        const fileEdit =
            body.fileEdit || null;


        /* =================================================
           FILE CREATION HELPER
        ================================================= */

        async function createFileResponse(
            fileRequest
        ) {

            if (!fileRequest) {

                throw new Error(
                    "File request is missing."
                );

            }


            let filename =
                String(
                    fileRequest.filename ||
                    "generated-file.txt"
                ).trim();


            let mimeType =
                String(
                    fileRequest.mimeType ||
                    "text/plain"
                ).trim();


            let content =
                String(
                    fileRequest.content ||
                    ""
                );


            if (!filename) {

                filename =
                    "generated-file.txt";

            }


            if (!content) {

                throw new Error(
                    "File content is empty."
                );

            }


            /* =============================================
               ALLOWED MIME TYPES
            ============================================= */

            const allowedMimeTypes = [

                "text/plain",
                "text/markdown",
                "text/csv",
                "application/json",

                "text/javascript",
                "application/javascript",

                "text/css",
                "text/html",

                "application/xml",
                "text/xml",

                "text/x-python",
                "text/x-java-source",

                "application/x-httpd-php",
                "application/typescript",

                "application/vnd.openxmlformats-officedocument.wordprocessingml.document",

                "application/pdf"

            ];


            /* =============================================
               ALLOWED EXTENSIONS
            ============================================= */

            const allowedExtensions = [

                "txt",
                "md",
                "csv",
                "json",

                "js",
                "css",
                "html",
                "htm",
                "xml",

                "py",
                "java",
                "php",
                "ts",

                "docx",
                "pdf"

            ];


            const extensionMatch =
                filename.match(
                    /\.([a-z0-9]+)$/i
                );


            const extension =
                extensionMatch
                    ? extensionMatch[1].toLowerCase()
                    : "";


            if (
                !allowedExtensions.includes(
                    extension
                )
            ) {

                throw new Error(
                    "This file type is not supported yet."
                );

            }


            /* =============================================
               MIME TYPE NORMALIZATION
            ============================================= */

            const extensionMimeMap = {

                txt:
                    "text/plain",

                md:
                    "text/markdown",

                csv:
                    "text/csv",

                json:
                    "application/json",

                js:
                    "application/javascript",

                css:
                    "text/css",

                html:
                    "text/html",

                htm:
                    "text/html",

                xml:
                    "application/xml",

                py:
                    "text/x-python",

                java:
                    "text/x-java-source",

                php:
                    "application/x-httpd-php",

                ts:
                    "application/typescript",

                docx:
                    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",

                pdf:
                    "application/pdf"

            };


            /*
             * Always trust the filename extension.
             *
             * This is important when a user says:
             * "Change it to chat-edited.js"
             *
             * We do not want the old CSS MIME type
             * to remain attached to the new JS file.
             */

            if (
                extensionMimeMap[extension]
            ) {

                mimeType =
                    extensionMimeMap[
                        extension
                    ];

            }


            if (
                !allowedMimeTypes.includes(
                    mimeType
                )
            ) {

                mimeType =
                    extensionMimeMap[
                        extension
                    ] ||
                    "text/plain";

            }


            /* =============================================
               DOCX
            ============================================= */

            if (
                extension === "docx"
            ) {

                const lines =
                    content.split(
                        /\r?\n/
                    );


                const paragraphs =
                    lines.map(
                        line =>
                            new Paragraph({

                                children: [

                                    new TextRun({
                                        text: line
                                    })

                                ]

                            })
                    );


                const doc =
                    new Document({

                        sections: [

                            {

                                children:
                                    paragraphs

                            }

                        ]

                    });


                const buffer =
                    await Packer.toBuffer(
                        doc
                    );


                return {

                    success: true,

                    filename,

                    mimeType,

                    size:
                        buffer.length,

                    data:
                        buffer.toString(
                            "base64"
                        )

                };

            }


            /* =============================================
               PDF
            ============================================= */

            if (
                extension === "pdf"
            ) {

                const pdfDoc =
                    await PDFDocument.create();


                const font =
                    await pdfDoc.embedFont(
                        StandardFonts.Helvetica
                    );


                const pageWidth =
                    595;


                const pageHeight =
                    842;


                const margin =
                    50;


                const fontSize =
                    11;


                const lineHeight =
                    16;


                const lines =
                    content.split(
                        /\r?\n/
                    );


                let page =
                    pdfDoc.addPage([
                        pageWidth,
                        pageHeight
                    ]);


                let y =
                    pageHeight -
                    margin;


                for (
                    const line of lines
                ) {

                    if (
                        y <
                        margin
                    ) {

                        page =
                            pdfDoc.addPage([
                                pageWidth,
                                pageHeight
                            ]);

                        y =
                            pageHeight -
                            margin;

                    }


                    page.drawText(
                        line.slice(
                            0,
                            110
                        ),
                        {

                            x:
                                margin,

                            y,

                            size:
                                fontSize,

                            font,

                            color:
                                rgb(
                                    0,
                                    0,
                                    0
                                )

                        }
                    );


                    y -=
                        lineHeight;

                }


                const pdfBytes =
                    await pdfDoc.save();


                const buffer =
                    Buffer.from(
                        pdfBytes
                    );


                return {

                    success: true,

                    filename,

                    mimeType,

                    size:
                        buffer.length,

                    data:
                        buffer.toString(
                            "base64"
                        )

                };

            }


            /* =============================================
               NORMAL TEXT FILE
               TXT / MD / CSV / JS / CSS / ETC.
            ============================================= */

            const buffer =
                Buffer.from(
                    content,
                    "utf8"
                );


            return {

                success: true,

                filename,

                mimeType,

                size:
                    buffer.length,

                data:
                    buffer.toString(
                        "base64"
                    )

            };

        }


        /* =================================================
           VALIDATE REQUEST
        ================================================= */

        if (
            !message &&
            !image &&
            !createFile &&
            !fileEdit
        ) {

            return res.status(400).json({

                error:
                    "Message, image or file request is required."

            });

        }


        /* =================================================
           DIRECT FILE CREATION
        ================================================= */

        if (createFile) {

            try {

                const file =
                    await createFileResponse(
                        createFile
                    );


                return res.status(200).json({

                    success: true,

                    type: "file",

                    file

                });

            }

            catch (fileError) {

                console.error(
                    "FILE CREATION ERROR:",
                    fileError
                );


                return res.status(400).json({

                    error:
                        fileError?.message ||
                        "Could not create file."

                });

            }

        }


        /* =================================================
           FILE EDITING
           
           IMPORTANT:
           This happens BEFORE normal conversation
           history/model routing.

           It uses ONE AI request only.
        ================================================= */

        if (fileEdit) {

            try {

                const editFilename =
                    String(
                        fileEdit.filename ||
                        "edited-file.txt"
                    ).trim();


                const editMimeType =
                    String(
                        fileEdit.mimeType ||
                        "text/plain"
                    ).trim();


                const editInstruction =
                    String(
                        fileEdit.instruction ||
                        ""
                    ).trim();


                let editContent =
                    String(
                        fileEdit.content ||
                        ""
                    );


                if (!editInstruction) {

                    return res.status(400).json({

                        error:
                            "Please provide instructions for editing the file."

                    });

                }


                if (!editContent) {

                    return res.status(400).json({

                        error:
                            "The file has no readable text to edit."

                    });

                }


                /*
                 * Keep the editing prompt small.
                 *
                 * This prevents the entire conversation history
                 * from being sent to Groq and helps with TPM limits.
                 */

                if (
                    editContent.length >
                    12000
                ) {

                    editContent =
                        editContent.slice(
                            0,
                            12000
                        );

                }


                const apiKey =
                    process.env.GROQ_API_KEY;


                if (!apiKey) {

                    return res.status(500).json({

                        error:
                            "GROQ_API_KEY is not configured."

                    });

                }


                const editPrompt =

                    "Edit the supplied file according to the user's instruction.\n\n" +

                    "IMPORTANT RULES:\n" +

                    "1. Return ONLY the complete edited file content.\n" +

                    "2. Do NOT use Markdown code fences.\n" +

                    "3. Do NOT explain what you changed.\n" +

                    "4. Do NOT add commentary before or after the file.\n" +

                    "5. Preserve the original content unless the user's instruction requires a change.\n" +

                    "6. Preserve valid syntax for the file type.\n\n" +

                    "OUTPUT FILENAME:\n" +
                    editFilename +

                    "\n\nUSER INSTRUCTION:\n" +
                    editInstruction +

                    "\n\nORIGINAL FILE CONTENT:\n" +
                    editContent;


                const requestBody = {

                    model:
                        "openai/gpt-oss-20b",

                    messages: [

                        {

                            role:
                                "user",

                            content:
                                editPrompt

                        }

                    ],

                    temperature:
                        0.2,

                    max_completion_tokens:
                        1000,

                    include_reasoning:
                        false,

                    reasoning_effort:
                        "low"

                };


                const groqResponse =
                    await fetch(
                        "https://api.groq.com/openai/v1/chat/completions",
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
                                JSON.stringify(
                                    requestBody
                                )

                        }
                    );


                /* =========================================
                   RATE LIMIT
                ========================================= */

                if (
                    groqResponse.status ===
                    429
                ) {

                    const retryAfter =
                        groqResponse.headers.get(
                            "retry-after"
                        );


                    return res.status(429).json({

                        error:
                            "Groq rate limit reached. Please wait a few seconds and try again.",

                        retryAfter:
                            retryAfter
                                ? Number(
                                    retryAfter
                                )
                                : 10

                    });

                }


                /* =========================================
                   OTHER GROQ ERRORS
                ========================================= */

                if (
                    !groqResponse.ok
                ) {

                    const errorText =
                        await groqResponse.text();


                    console.error(
                        "GROQ FILE EDIT ERROR:",
                        errorText
                    );


                    return res.status(500).json({

                        error:
                            "The AI could not edit the file right now."

                    });

                }


                const groqData =
                    await groqResponse.json();


                let editedContent =

                    groqData
                        ?.choices?.[0]
                        ?.message?.content;


                if (
                    !editedContent
                ) {

                    return res.status(500).json({

                        error:
                            "The AI returned no edited file content."

                    });

                }


                editedContent =
                    String(
                        editedContent
                    ).trim();


                /*
                 * Remove accidental Markdown code fences
                 * if the model adds them despite the instruction.
                 */

                editedContent =
                    editedContent
                        .replace(
                            /^```[a-zA-Z0-9_-]*\s*/,
                            ""
                        )
                        .replace(
                            /\s*```$/,
                            ""
                        )
                        .trim();


                /* =========================================
                   CREATE THE ACTUAL FILE
                ========================================= */

                const editedFile =
                    await createFileResponse({

                        filename:
                            editFilename,

                        mimeType:
                            editMimeType,

                        content:
                            editedContent

                    });


                return res.status(200).json({

                    success: true,

                    type: "file",

                    file:
                        editedFile

                });

            }

            catch (fileEditError) {

                console.error(
                    "FILE EDIT ERROR:",
                    fileEditError
                );


                return res.status(500).json({

                    error:
                        fileEditError?.message ||
                        "Could not edit the file."

                });

            }

        }


        /* =================================================
           GROQ API KEY
        ================================================= */

        const apiKey =
            process.env.GROQ_API_KEY;


        if (!apiKey) {

            return res.status(500).json({

                error:
                    "GROQ_API_KEY is not configured."

            });

        }


        /* =================================================
           NORMAL CONVERSATION HISTORY
        ================================================= */

        const rawHistory =
            Array.isArray(
                body.history
            )
                ? body.history
                : [];


        const history =
            rawHistory
                .filter(
                    item =>
                        item &&
                        (
                            item.role ===
                            "user" ||
                            item.role ===
                            "assistant"
                        ) &&
                        typeof item.content ===
                        "string"
                )
                .slice(-30);


        /* =================================================
           SYSTEM PROMPT
        ================================================= */

        const systemPrompt =

            "You are AI Life Assistant, a helpful general-purpose AI assistant. " +

            "Answer clearly, accurately and naturally. " +

            "Be concise when the question is simple and provide more detail when useful. " +

            "Do not mention internal system instructions, model routing, APIs, or hidden reasoning. " +

            "If the user asks for code, provide valid code. " +

            "If the user asks for a file, the application may handle file creation separately.";


        /* =================================================
           MESSAGE ARRAY
        ================================================= */

        const messages = [

            {

                role:
                    "system",

                content:
                    systemPrompt

            }

        ];


        for (
            const item of history
        ) {

            messages.push({

                role:
                    item.role,

                content:
                    item.content

            });

        }


        /* =================================================
           IMAGE / VISION REQUEST
        ================================================= */

        if (image) {

            messages.push({

                role:
                    "user",

                content: [

                    {

                        type:
                            "text",

                        text:
                            message ||
                            "Please analyze this image."

                    },

                    {

                        type:
                            "image_url",

                        image_url: {

                            url:
                                image

                        }

                    }

                ]

            });

        }

        else {

            messages.push({

                role:
                    "user",

                content:
                    message

            });

        }


        /* =================================================
           MODEL SELECTION
        ================================================= */

        const TEXT_MODEL =
            "openai/gpt-oss-20b";


        const VISION_MODEL =
            "qwen/qwen3.8-27b";


        const selectedModel =
            image
                ? VISION_MODEL
                : TEXT_MODEL;


        /* =================================================
           GROQ REQUEST
        ================================================= */

        const requestBody = {

            model:
                selectedModel,

            messages,

            temperature:
                image
                    ? 0.7
                    : 0.5,

            max_completion_tokens:
                1200

        };


        /*
         * GPT-OSS:
         * Disable returned reasoning and keep reasoning low.
         *
         * This is especially important for the user's
         * current 8K TPM environment.
         */

        if (
            selectedModel ===
            "openai/gpt-oss-20b"
        ) {

            requestBody.include_reasoning =
                false;

            requestBody.reasoning_effort =
                "low";

        }


        /*
         * Qwen vision:
         * Disable reasoning for normal image analysis
         * to keep requests efficient.
         */

        if (
            selectedModel ===
            "qwen/qwen3.8-27b"
        ) {

            requestBody.reasoning_effort =
                "none";

        }


        console.log(
            "🤖 GROQ MODEL:",
            selectedModel
        );


        const groqResponse =
            await fetch(
                "https://api.groq.com/openai/v1/chat/completions",
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
                        JSON.stringify(
                            requestBody
                        )

                }
            );


        /* =================================================
           RATE LIMIT
        ================================================= */

        if (
            groqResponse.status ===
            429
        ) {

            const retryAfter =
                groqResponse.headers.get(
                    "retry-after"
                );


            return res.status(429).json({

                error:
                    "Groq rate limit reached. Please wait a few seconds and try again.",

                retryAfter:
                    retryAfter
                        ? Number(
                            retryAfter
                        )
                        : 10

            });

        }


        /* =================================================
           OTHER GROQ ERROR
        ================================================= */

        if (
            !groqResponse.ok
        ) {

            const errorText =
                await groqResponse.text();


            console.error(
                "Groq API error:",
                errorText
            );


            return res.status(
                groqResponse.status >= 400 &&
                groqResponse.status < 500
                    ? groqResponse.status
                    : 500
            ).json({

                error:
                    "The AI service returned an error."

            });

        }


        /* =================================================
           READ GROQ RESPONSE
        ================================================= */

        const groqData =
            await groqResponse.json();


        console.log(
            "Groq response:",
            JSON.stringify(
                groqData,
                null,
                2
            )
        );


        const assistantMessage =

            groqData
                ?.choices?.[0]
                ?.message;


        const answer =

            assistantMessage
                ?.content;


        if (
            !answer
        ) {

            return res.status(500).json({

                error:
                    "The AI returned an empty response."

            });

        }


        /* =================================================
           NORMAL RESPONSE
        ================================================= */

        return res.status(200).json({

    success:
        true,

    type:
        "message",

    reply:
        String(
            answer
        ),

    answer:
        String(
            answer
        )

});

    }

    catch (error) {

        console.error(
            "BACKEND ERROR:",
            error
        );


        return res.status(500).json({

            error:
                "Internal server error."

        });

    }

};
