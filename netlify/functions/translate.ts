import type { Context } from "@netlify/functions"
import Groq from 'groq-sdk';
import Cerebras from '@cerebras/cerebras_cloud_sdk';

export default async (req: Request, context: Context) => {
    // Basic GET handler for health check
    if (req.method === "GET") {
        const groqKeySet = !!process.env.GROQ_API_KEY;
        const cerebrasKeySet = !!process.env.CEREBRAS_API_KEY;
        return new Response(JSON.stringify({
            status: "ok",
            message: "Translate function is active",
            config: {
                groq: groqKeySet ? "Configured" : "Missing",
                cerebras: cerebrasKeySet ? "Configured" : "Missing"
            }
        }), {
            headers: { "Content-Type": "application/json" }
        });
    }

    // Only allow POST for actual translation
    if (req.method !== "POST") {
        return new Response("Method Not Allowed", { status: 405 });
    }

    const groqApiKey = process.env.GROQ_API_KEY;
    const cerebrasApiKey = process.env.CEREBRAS_API_KEY;

    try {
        let body;
        try {
            body = await req.json();
        } catch (e) {
            return new Response(JSON.stringify({ error: "Invalid JSON in request body" }), { status: 400 });
        }

        const { text, targetLang } = body;

        if (!text || !targetLang) {
            return new Response(JSON.stringify({ error: "Missing text or targetLang" }), { status: 400 });
        }

        console.log(`Translate request: ${text.substring(0, 20)}... -> ${targetLang}`);

        // Logic to determine which provider to use
        let useCerebras = Math.random() < 0.5;

        if (!cerebrasApiKey) useCerebras = false;
        if (!groqApiKey) useCerebras = true;

        if (!groqApiKey && !cerebrasApiKey) {
            console.error("No API keys found in environment variables.");
            return new Response(JSON.stringify({ error: "Server configuration error: Missing API Keys" }), { status: 500 });
        }

        let translatedText = "";
        let provider = "";

        // Attempt choice 1
        if (useCerebras && cerebrasApiKey) {
            provider = "Cerebras";
            try {
                console.log("Using Cerebras...");
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
                console.error("Cerebras service error:", e.message);
                // Fallback to Groq
                useCerebras = false;
            }
        }

        // Attempt choice 2 (or fallback)
        if (!useCerebras && groqApiKey) {
            provider = "Groq";
            try {
                console.log("Using Groq...");
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
                console.error("Groq service error:", e.message);
                throw new Error(`Groq failed: ${e.message}`);
            }
        }

        if (!translatedText) {
            throw new Error("Target provider returned empty response");
        }

        return new Response(JSON.stringify({ translatedText, provider }), {
            headers: { "Content-Type": "application/json" }
        });

    } catch (error: any) {
        console.error("Translation function failure:", error.message);
        return new Response(JSON.stringify({
            error: error.message,
            stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
        }), {
            status: 500,
            headers: { "Content-Type": "application/json" }
        });
    }
}
