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

        const providers = [];
        if (groqKey && groqKey.length > 5) providers.push("Groq");
        if (cerebrasKey && cerebrasKey.length > 5) providers.push("Cerebras");

        if (providers.length === 0) {
            return new Response(JSON.stringify({
                error: "No API keys configured. Set GROQ_API_KEY or CEREBRAS_API_KEY in Netlify UI."
            }), { status: 500 });
        }

        // Randomize order
        if (Math.random() < 0.5) providers.reverse();

        let translatedText = "";
        let finalProvider = "";
        const errors: string[] = [];

        for (const provider of providers) {
            try {
                if (provider === "Cerebras") {
                    console.log("Trying Cerebras...");
                    const response = await fetch("https://api.cerebras.ai/v1/chat/completions", {
                        method: "POST",
                        headers: {
                            "Authorization": `Bearer ${cerebrasKey}`,
                            "Content-Type": "application/json"
                        },
                        body: JSON.stringify({
                            model: "llama-3.3-70b", // Updated to a very common model
                            messages: [
                                { role: "system", content: `Translate to ${targetLang}. Only return the translation.` },
                                { role: "user", content: text }
                            ],
                            temperature: 0.1
                        })
                    });

                    if (response.ok) {
                        const data = await response.json();
                        translatedText = data.choices?.[0]?.message?.content?.trim() || "";
                        if (translatedText) {
                            finalProvider = "Cerebras";
                            break;
                        } else {
                            errors.push("Cerebras: Empty response content");
                        }
                    } else {
                        const errText = await response.text();
                        errors.push(`Cerebras API (${response.status}): ${errText.substring(0, 100)}`);
                    }
                } else if (provider === "Groq") {
                    console.log("Trying Groq...");
                    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
                        method: "POST",
                        headers: {
                            "Authorization": `Bearer ${groqKey}`,
                            "Content-Type": "application/json"
                        },
                        body: JSON.stringify({
                            model: "llama-3.3-70b-versatile",
                            messages: [
                                { role: "system", content: `Translate to ${targetLang}. Only return the translation.` },
                                { role: "user", content: text }
                            ],
                            temperature: 0.1
                        })
                    });

                    if (response.ok) {
                        const data = await response.json();
                        translatedText = data.choices?.[0]?.message?.content?.trim() || "";
                        if (translatedText) {
                            finalProvider = "Groq";
                            break;
                        } else {
                            errors.push("Groq: Empty response content");
                        }
                    } else {
                        const errText = await response.text();
                        errors.push(`Groq API (${response.status}): ${errText.substring(0, 100)}`);
                    }
                }
            } catch (e: any) {
                errors.push(`${provider} Fetch Error: ${e.message}`);
            }
        }

        if (!translatedText) {
            return new Response(JSON.stringify({
                error: "All configured providers failed.",
                details: errors
            }), {
                status: 500,
                headers: { "Content-Type": "application/json" }
            });
        }

        return new Response(JSON.stringify({
            translatedText,
            provider: finalProvider
        }), {
            headers: { "Content-Type": "application/json" }
        });

    } catch (error: any) {
        return new Response(JSON.stringify({ error: error.message }), {
            status: 500,
            headers: { "Content-Type": "application/json" }
        });
    }
}
