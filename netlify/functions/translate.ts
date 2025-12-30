import type { Context } from "@netlify/functions"
import Groq from 'groq-sdk';
import Cerebras from '@cerebras/cerebras_cloud_sdk';

export default async (req: Request, context: Context) => {
    // Only allow POST
    if (req.method !== "POST") {
        return new Response("Method Not Allowed", { status: 405 });
    }

    const groqApiKey = process.env.GROQ_API_KEY;
    const cerebrasApiKey = process.env.CEREBRAS_API_KEY;

    try {
        const body = await req.json();
        const { text, targetLang } = body;

        if (!text || !targetLang) {
            return new Response(JSON.stringify({ error: "Missing text or targetLang" }), { status: 400 });
        }

        // Logic to determine which provider to use
        let useCerebras = Math.random() < 0.5;

        // Dynamic fallback based on availability of keys
        if (!cerebrasApiKey) {
            console.log("Cerebras API key missing, using Groq");
            useCerebras = false;
        }
        if (!groqApiKey) {
            console.log("Groq API key missing, using Cerebras");
            useCerebras = true;
        }

        if (!groqApiKey && !cerebrasApiKey) {
            console.error("Neither GROQ_API_KEY nor CEREBRAS_API_KEY is configured.");
            return new Response(JSON.stringify({ error: "Server configuration error: Missing API Keys" }), { status: 500 });
        }

        let translatedText = "";
        let provider = "";

        // Attempt choice 1
        if (useCerebras && cerebrasApiKey) {
            provider = "Cerebras";
            try {
                const cerebras = new Cerebras({ apiKey: cerebrasApiKey });
                const completion = await cerebras.chat.completions.create({
                    messages: [
                        { role: "system", content: `You are a helpful translator. Translate the user's text to ${targetLang}. Return ONLY the translated text, no introductory or concluding remarks.` },
                        { role: "user", content: text }
                    ],
                    model: 'llama3.1-70b',
                    temperature: 0.3,
                });
                translatedText = completion.choices[0]?.message?.content?.trim() || "";
            } catch (e: any) {
                console.error("Cerebras failed, falling back to Groq if possible:", e.message);
                useCerebras = false;
            }
        }

        // Attempt choice 2 (or fallback)
        if (!useCerebras && groqApiKey) {
            provider = "Groq";
            try {
                const groq = new Groq({ apiKey: groqApiKey });
                const completion = await groq.chat.completions.create({
                    messages: [
                        { role: "system", content: `You are a helpful translator. Translate the user's text to ${targetLang}. Return ONLY the translated text, no introductory or concluding remarks.` },
                        { role: "user", content: text }
                    ],
                    model: "llama-3.3-70b-versatile",
                    temperature: 0.3,
                });
                translatedText = completion.choices[0]?.message?.content?.trim() || "";
            } catch (e: any) {
                console.error("Groq failed:", e.message);
                throw new Error(`Groq provider failed: ${e.message}`);
            }
        }

        if (!translatedText) {
            throw new Error("Chosen provider failed to return a translation.");
        }

        console.log(`Translation handled by: ${provider}`);

        return new Response(JSON.stringify({ translatedText, provider }), {
            headers: { "Content-Type": "application/json" }
        });

    } catch (error: any) {
        console.error("Final Function Error:", error.message);
        return new Response(JSON.stringify({ error: error.message }), {
            status: 500,
            headers: { "Content-Type": "application/json" }
        });
    }
}
