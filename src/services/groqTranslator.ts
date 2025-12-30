
export async function translateText(text: string, targetLang: string): Promise<string> {
  if (!text.trim()) return "";

  const functionUrl = '/.netlify/functions/translate';

  // 1. Try Netlify Function first (Works in production and with 'netlify dev')
  try {
    const response = await fetch(functionUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text, targetLang }),
    });

    if (response.ok) {
      const data = await response.json();
      console.log(`Translation success via Function (${data.provider})`);
      return data.translatedText;
    }

    // If it's not a 404, the function exists but failed - we should report that error
    if (response.status !== 404) {
      let errorMsg;
      try {
        const errorData = await response.json();
        errorMsg = errorData.error || `Server error: ${response.status}`;
        if (errorData.details && Array.isArray(errorData.details)) {
          errorMsg += ". Details: " + errorData.details.join(" | ");
        }
      } catch (e) {
        errorMsg = `Server error: ${response.status} ${response.statusText}`;
      }
      throw new Error(errorMsg);
    }

    console.warn("Netlify function not found (404), attempting local fallback...");

  } catch (error: any) {
    // If it's a TypeError (connection refused) or we caught our own Error from above
    if (error instanceof Error && !error.message.includes("Server error")) {
      console.warn("Netlify function unreachable, attempting local fallback...");
    } else {
      throw error; // Re-throw actual server errors or validation errors
    }
  }

  // 2. Local Fallback: Direct API calls (Works with 'pnpm run dev')
  const groqKey = import.meta.env.VITE_GROQ_API_KEY;
  const cerebrasKey = import.meta.env.VITE_CEREBRAS_API_KEY;

  if (!groqKey && !cerebrasKey) {
    throw new Error("Translation failed: Netlify function not found and no local VITE_ keys configured.");
  }

  let translatedText = "";
  let errorMsg = "";

  // Try Cerebras locally first if available
  if (cerebrasKey) {
    try {
      console.log("Calling Cerebras API directly (Local Mode)...");
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
          temperature: 0.1
        })
      });

      if (response.ok) {
        const data = await response.json();
        translatedText = data.choices?.[0]?.message?.content?.trim() || "";
      } else {
        errorMsg = `Cerebras Local Error (${response.status})`;
      }
    } catch (e: any) {
      errorMsg = `Cerebras Fetch Error: ${e.message}`;
    }
  }

  // Fallback to Groq if Cerebras failed or was skipped
  if (!translatedText && groqKey) {
    try {
      console.log("Calling Groq API directly (Local Mode)...");
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
      } else {
        errorMsg = `Groq Local Error (${response.status})`;
      }
    } catch (e: any) {
      errorMsg = `Groq Fetch Error: ${e.message}`;
    }
  }

  if (translatedText) return translatedText;

  throw new Error(`Local fallback failed: ${errorMsg || "No valid provider configured"}`);
}
