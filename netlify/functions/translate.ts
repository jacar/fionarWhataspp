import type { Context } from "@netlify/functions"
import Groq from 'groq-sdk';

const apiKey = process.env.GROQ_API_KEY;

const groq = new Groq({
    apiKey: apiKey,
});

export default async (req: Request, context: Context) => {
    // Only allow POST
    if (req.method !== "POST") {
        return new Response("Method Not Allowed", { status: 405 });
    }

    if (!apiKey) {
        console.error("Missing GROQ_API_KEY");
        return new Response("Server configuration error: Missing API Key", { status: 500 });
    }

    try {
        const body = await req.json();
        const { text, targetLang } = body;

        if (!text || !targetLang) {
            return new Response("Missing text or targetLang", { status: 400 });
        }

        const completion = await groq.chat.completions.create({
            messages: [
                {
                    role: "system",
                    content: `You are a helpful translator. Translate the user's text to ${targetLang}. Return ONLY the translated text, no introductory or concluding remarks.`
                },
                {
                    role: "user",
                    content: text
                }
            ],
            model: "llama-3.3-70b-versatile",
            temperature: 0.3,
        });

        const translatedText = completion.choices[0]?.message?.content?.trim() || "";

        return new Response(JSON.stringify({ translatedText }), {
            headers: { "Content-Type": "application/json" }
        });

    } catch (error: any) {
        console.error("Translation error:", error);
        return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: { "Content-Type": "application/json" } });
    }
}
