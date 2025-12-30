
export async function translateText(text: string, targetLang: string): Promise<string> {
  if (!text.trim()) return "";

  try {
    const response = await fetch('/.netlify/functions/translate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ text, targetLang }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || `Server error: ${response.status}`);
    }

    const data = await response.json();
    return data.translatedText;

  } catch (error: any) {
    console.error("Translation error:", error);
    throw new Error(`Translation failed: ${error.message || 'Unknown error'}`);
  }
}
