import type { Context } from "@netlify/functions"

export default async (req: Request, context: Context) => {
    // Basic GET handler for health check
    if (req.method === "GET") {
        const groqKey = process.env.GROQ_API_KEY || "";
        const cerebrasKey = process.env.CEREBRAS_API_KEY || "";
        return new Response(JSON.stringify({
            status: "ok",
            message: "Translate function is active",
            config: {
                groq: groqKey.length > 5 ? "Configured (Length: " + groqKey.length + ")" : "Missing/Empty",
                cerebras: cerebrasKey.length > 5 ? "Configured (Length: " + cerebrasKey.length + ")" : "Missing/Empty"
            }
        }), {
            headers: { "Content-Type": "application/json" }
        });
    }

    if (req.method !== "POST") {
        return new Response("Method Not Allowed", { status: 405 });
    }

    const groqKey = process.env.GROQ_API_KEY || "";
    const cerebrasKey = process.env.CEREBRAS_API_KEY || "";

    try {
        const { text, targetLang } = await req.json();

        if (!text || !targetLang) {
            return new Response(JSON.stringify({ error: "Missing text or targetLang" }), { status: 400 });
        }

        // Provider selection logic: balance and fallback
        let useCerebras = Math.random() < 0.5;

        if (!cerebrasKey || cerebrasKey.length < 5) useCerebras = false;
        if (!groqKey || groqKey.length < 5) useCerebras = true;

        if (!groqKey && !cerebrasKey) {
            return new Response(JSON.stringify({
                error: "API Keys are not configured in Netlify environment variables. Please add GROQ_API_KEY and/or CEREBRAS_API_KEY."
            }), { status: 500 });
        }

        let translatedText = "";
        let provider = "";

        // Attempt choice 1
        if (useCerebras && cerebrasKey) {
            provider = "Cerebras";
            try {
                console.log("Calling Cerebras API...");
                const response = await fetch("https://api.cerebras.ai/v1/chat/completions", {
                    method: "POST",
                    headers: {
                        "Authorization": `Bearer ${cerebrasKey}`,
                        "Content-Type": "application/json"
                    },
                    body: JSON.stringify({
                        model: "llama3.1-70b",
                        messages: [
                            { role: "system", content: `Translate to ${targetLang}. Return ONLY the translation.` },
                            { role: "user", content: text }
                        ],
                        temperature: 0.3
                    })
                });

                if (response.ok) {
                    const data = await response.json();
                    translatedText = data.choices[0]?.message?.content?.trim() || "";
                } else {
                    const err = await response.text();
                    console.error("Cerebras API Error:", response.status, err);
                    useCerebras = false; // Trigger fallback
                }
            } catch (e: any) {
                console.error("Cerebras request failed:", e.message);
                useCerebras = false;
            }
        }

        // Attempt choice 2 (or fallback from Cerebras)
        if (!useCerebras && groqKey) {
            provider = "Groq";
            console.log("Calling Groq API...");
            const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
                method: "POST",
                headers: {
                    "Authorization": `Bearer ${groqKey}`,
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    model: "llama-3.3-70b-versatile",
                    messages: [
                        { role: "system", content: `Translate to ${targetLang}. Return ONLY the translation.` },
                        { role: "user", content: text }
                    ],
                    temperature: 0.3
                })
            });

            if (response.ok) {
                const data = await response.json();
                translatedText = data.choices[0]?.message?.content?.trim() || "";
            } else {
                const err = await response.text();
                console.error("Groq API Error:", response.status, err);
                throw new Error(`Groq API returned ${response.status}: ${err}`);
            }
        }

        if (!translatedText) {
            throw new Error(`Translation failed: Selected provider (${provider}) returned no result.`);
        }

        console.log(`Successfully translated via ${provider}`);

        return new Response(JSON.stringify({ translatedText, provider }), {
            headers: { "Content-Type": "application/json" }
        });

    } catch (error: any) {
        console.error("Handler Error:", error.message);
        return new Response(JSON.stringify({ error: error.message }), {
            status: 500,
            headers: { "Content-Type": "application/json" }
        });
    }
}
