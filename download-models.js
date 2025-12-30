import fs from 'fs';
import path from 'path';

const files = [
    {
        url: 'https://huggingface.co/rhasspy/piper-voices/resolve/main/es/es_MX/ald/medium/es_MX-ald-medium.onnx?download=true',
        dest: 'public/es_MX-ald-medium.onnx'
    },
    {
        url: 'https://huggingface.co/rhasspy/piper-voices/resolve/main/es/es_MX/ald/medium/es_MX-ald-medium.onnx.json?download=true',
        dest: 'public/es_MX-ald-medium.onnx.json'
    }
];

const download = async (url, dest) => {
    try {
        // @ts-ignore
        const response = await fetch(url);
        if (!response.ok) {
            console.error(`Status: ${response.status} ${response.statusText}`);
            throw new Error(`unexpected response ${response.statusText}`);
        }

        const buffer = await response.arrayBuffer();
        fs.writeFileSync(dest, Buffer.from(buffer));
        console.log(`Downloaded ${dest}`);
    } catch (error) {
        console.error(`Error downloading ${url}:`, error);
        process.exit(1);
    }
};

(async () => {
    for (const file of files) {
        await download(file.url, file.dest);
    }
})();
