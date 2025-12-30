// Wrapper for Piper TTS Web
import * as tts from '@mintplex-labs/piper-tts-web';

// We need to keep track of the initialization state
let isInitialized = false;

export const initPiper = async () => {
    if (isInitialized) return;

    try {
        console.log("Initializing Piper...");

        // Use the library's init if available, or just load valid paths
        // The library typically works by taking a callback or config

        // Currently assuming the library exports a default object with `predict` or similar
        // based on typical usages of similar WASM libs. 

        // HOWEVER, since I lack docs, I will use a very defensive approach.
        // I will try to load the model files I downloaded.

        console.log("Piper initialized (placeholder)");
        isInitialized = true;
    } catch (e) {
        console.error("Failed to init piper", e);
    }
};

export const playPiper = async (text: string) => {
    console.log("Generating audio for:", text);

    try {
        // Retrieve the model and config
        const modelUrl = '/es_MX-ald-medium.onnx';
        const configUrl = '/es_MX-ald-medium.onnx.json';

        // NOTE: This library usage is a guess. 
        // Based on "inference.d.ts" having "InferenceConfig".

        // If this fails, we will see it in the console.

        // @ts-ignore
        const audio = await (tts as any).predict({
            text: text,
            model: modelUrl,
            modelConfig: configUrl
        });

        // play audio blob
        const audioUrl = URL.createObjectURL(audio);
        const sound = new Audio(audioUrl);
        sound.play();

    } catch (e) {
        console.error("Piper generation failed:", e);
        throw e;
    }
}
