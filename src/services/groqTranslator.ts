
export async function translateText(text: string, targetLang: string): Promise<string> {
  if (!text.trim()) return "";

  const url = '/.netlify/functions/translate';
  console.log(`Calling translation function at ${url}...`);

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ text, targetLang }),
    });

    if (!response.ok) {
      let errorMsg;
      try {
        const errorData = await response.json();
        errorMsg = errorData.error || `Server error: ${response.status}`;
      } catch (e) {
        errorMsg = `Server error: ${response.status} ${response.statusText}`;
      }
      console.error(`Translation server error: ${errorMsg}`);
      throw new Error(errorMsg);
    }

    const data = await response.json();
    console.log(`Translation success via ${data.provider}`);
    return data.translatedText;

  } catch (error: any) {
    console.error("Translation client failure:", error);
    throw new Error(`Translation failed: ${error.message || 'Unknown error'}`);
  }
}
