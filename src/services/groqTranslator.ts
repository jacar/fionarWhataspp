import Groq from 'groq-sdk';

const apiKey = import.meta.env.VITE_GROQ_API_KEY;

const groq = new Groq({
  apiKey: apiKey,
  dangerouslyAllowBrowser: true // Required for client-side usage
});

export async function translateText(text: string, targetLang: string): Promise<string> {
  if (!apiKey) {
    console.error("Missing VITE_GROQ_API_KEY");
    throw new Error("Missing VITE_GROQ_API_KEY in environment variables");
  }

  if (!text.trim()) return "";

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

    return completion.choices[0]?.message?.content?.trim() || "";
  } catch (error: any) {
    console.error("Translation error:", error);
    throw new Error(`Translation failed: ${error.message || 'Unknown error'}`);
  }
}
