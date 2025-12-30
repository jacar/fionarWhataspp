
export async function translateText(text: string, targetLang: string): Promise<string> {
  if (!text.trim()) return "";

  const functionUrl = '/api/translate';

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

  } catch (error: any) {
    console.error("Translation failure:", error.message);
    throw error;
  }
}
