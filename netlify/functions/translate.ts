import type { Context } from "@netlify/functions"

export default async (req: Request, context: Context) => {
    // Health check
    if (req.method === "GET") {
        const groqKey = process.env.GROQ_API_KEY || "";
        const cerebrasKey = process.env.CEREBRAS_API_KEY || "";
        return new Response(JSON.stringify({
            status: "ok",
            message: "Translate function is active",
            config: {
                groq: groqKey.length > 5 ? "Configured" : "Missing",
                cerebras: cerebrasKey.length > 5 ? "Configured" : "Missing"
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

        let translatedText = "";
        let providerUsed = "";

        // Determine initial choice
        let tryCerebrasFirst = Math.random() < 0.5;
        if (!cerebrasKey || cerebrasKey.length < 5) tryCerebrasFirst = false;
        if (!groqKey || groqKey.length < 5) tryCerebrasFirst = true;

        if (!groqKey && !cerebrasKey) {
            return new Response(JSON.stringify({ error: "No API keys configured" }), { status: 500 });
        }

        // --- ATTEMPT 1: CEREBRAS ---
        if (tryCerebrasFirst && cerebrasKey) {
            providerUsed = "Cerebras";
            try {
                const response = await fetch("https://api.cerebras.ai/v1/chat/completions", {
                    method: "POST",
                    headers: {
                        "Authorization": `Bearer ${cerebrasKey}`,
                        "Content-Type": "application/json"
                    },
                    body: JSON.stringify({
                        model: "llama3.1-70b",
                        messages: [
                            { role: "system", content: `Translate to ${targetLang}. Return ONLY the translation text.` },
                            { role: "user", content: text }
                        ],
                        temperature: 0.1
                    })
                });

                if (response.ok) {
                    const data = await response.json();
                    translatedText = data.choices?.[0]?.message?.content?.trim() || "";
                    console.log("Cerebras translation success");
                } else {
                    const err = await response.text();
                    console.error("Cerebras API returned error:", response.status, err);
                }
            } catch (e: any) {
                console.error("Cerebras fetch failed:", e.message);
            }
        }

        // --- ATTEMPT 2: GROQ (or fallback if Cerebras failed/returned nothing) ---
        if (!translatedText && groqKey) {
            providerUsed = "Groq";
            try {
                const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
                    method: "POST",
                    headers: {
                        "Authorization": `Bearer ${groqKey}`,
                        "Content-Type": "application/json"
                    },
                    body: JSON.stringify({
                        model: "llama-3.3-70b-versatile",
                        messages: [
                            { role: "system", content: `Translate to ${targetLang}. Return ONLY the translation text.` },
                            { role: "user", content: text }
                        ],
                        temperature: 0.1
                    })
                });

                if (response.ok) {
                    const data = await response.json();
                    translatedText = data.choices?.[0]?.message?.content?.trim() || "";
                    console.log("Groq translation success");
                } else {
                    const err = await response.text();
                    console.error("Groq API returned error:", response.status, err);
                }
            } catch (e: any) {
                console.error("Groq fetch failed:", e.message);
            }
        }

        // --- FINAL CHECK ---
        if (!translatedText) {
            throw new Error(`Both providers failed or returned no result. Last provider tried: ${providerUsed}`);
        }

        return new Response(JSON.stringify({
            translatedText,
            provider: providerUsed
        }), {
            headers: { "Content-Type": "application/json" }
        });

    } catch (error: any) {
        console.error("Final Translation Function Error:", error.message);
        return new Response(JSON.stringify({ error: error.message }), {
            status: 500,
            headers: { "Content-Type": "application/json" }
        });
    }
}
