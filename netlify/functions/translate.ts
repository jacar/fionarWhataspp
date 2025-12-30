import type { Context } from "@netlify/functions"
import Groq from 'groq-sdk';
import Cerebras from '@cerebras/cerebras_cloud_sdk';

const groqApiKey = process.env.GROQ_API_KEY;
const cerebrasApiKey = process.env.CEREBRAS_API_KEY;

const groq = new Groq({
    apiKey: groqApiKey,
});

const cerebras = new Cerebras({
    apiKey: cerebrasApiKey,
});

export default async (req: Request, context: Context) => {
    // Only allow POST
    if (req.method !== "POST") {
        return new Response("Method Not Allowed", { status: 405 });
    }

    try {
        const body = await req.json();
        const { text, targetLang } = body;

        if (!text || !targetLang) {
            return new Response(JSON.stringify({ error: "Missing text or targetLang" }), { status: 400 });
        }

        // Simple rotation logic: try to balance or fallback
        let useCerebras = Math.random() < 0.5;

        // Ensure keys exist
        if (!cerebrasApiKey) useCerebras = false;
        if (!groqApiKey) useCerebras = true;

        if (!groqApiKey && !cerebrasApiKey) {
            return new Response(JSON.stringify({ error: "Server configuration error: Missing API Keys" }), { status: 500 });
        }

        let translatedText = "";
        let provider = "";

        if (useCerebras) {
            provider = "Cerebras";
            try {
                const completion = await cerebras.chat.completions.create({
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
                    model: 'llama3.1-70b',
                    temperature: 0.3,
                });
                translatedText = completion.choices[0]?.message?.content?.trim() || "";
            } catch (e: any) {
                console.error("Cerebras failed, falling back to Groq:", e);
                useCerebras = false; // Trigger fallback to Groq below
            }
        }

        if (!useCerebras) {
            provider = "Groq";
            try {
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
                translatedText = completion.choices[0]?.message?.content?.trim() || "";
            } catch (e: any) {
                // If Groq was the initial choice and failed, we can't fall back to Cerebras easily here 
                // without redundant code, so we just throw.
                throw e;
            }
        }

        console.log(`Translation handled by: ${provider}`);

        return new Response(JSON.stringify({ translatedText, provider }), {
            headers: { "Content-Type": "application/json" }
        });

    } catch (error: any) {
        console.error("Translation error:", error);
        return new Response(JSON.stringify({ error: error.message }), {
            status: 500,
            headers: { "Content-Type": "application/json" }
        });
    }
}
