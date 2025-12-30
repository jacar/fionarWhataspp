
import React, { useState, useEffect, useRef } from 'react';
import { translateText } from '../services/groqTranslator';
import { playPiper } from '../services/piper';

// Add type definition for Web Speech API
declare global {
    interface Window {
        webkitSpeechRecognition: any;
    }
}

const LANGUAGES = [
    { code: 'en', name: 'English' },
    { code: 'es', name: 'Spanish' },
    { code: 'fr', name: 'French' },
    { code: 'de', name: 'German' },
    { code: 'it', name: 'Italian' },
    { code: 'pt', name: 'Portuguese' },
    { code: 'ru', name: 'Russian' },
    { code: 'zh', name: 'Chinese (Simplified)' },
    { code: 'ja', name: 'Japanese' },
];

export const RealTimeTranslator: React.FC = () => {
    const [inputText, setInputText] = useState('');
    const [translatedText, setTranslatedText] = useState('');
    const [sourceLang, setSourceLang] = useState('es'); // Default Spanish source
    const [targetLang, setTargetLang] = useState('en'); // Default English target
    const [isLoading, setIsLoading] = useState(false);
    const [isListening, setIsListening] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const timeoutRef = useRef<any>(null);
    const recognitionRef = useRef<any>(null);

    const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
    const [selectedVoice, setSelectedVoice] = useState<SpeechSynthesisVoice | null>(null);

    // Fetch voices
    useEffect(() => {
        const updateVoices = () => {
            const allVoices = window.speechSynthesis.getVoices();
            setVoices(allVoices);
        };

        updateVoices();
        window.speechSynthesis.onvoiceschanged = updateVoices;

        return () => {
            window.speechSynthesis.onvoiceschanged = null;
        };
    }, []);

    // Update selected voice when target language changes or voices load
    useEffect(() => {
        const availableVoices = voices.filter(v => v.lang.startsWith(targetLang));
        if (availableVoices.length > 0) {
            let preferred: SpeechSynthesisVoice | undefined;

            // Specific logic for Spanish (prefer Colombia, then Latin America, then Mexico)
            if (targetLang === 'es') {
                preferred = availableVoices.find(v => v.lang === 'es-CO'); // Colombia
                if (!preferred) preferred = availableVoices.find(v => v.lang === 'es-419'); // Latin America
                if (!preferred) preferred = availableVoices.find(v => v.lang === 'es-MX'); // Mexico
            }

            // General fallback to Google/Microsoft
            if (!preferred) {
                preferred = availableVoices.find(v => v.name.includes("Google") || v.name.includes("Microsoft"));
            }

            setSelectedVoice(preferred || availableVoices[0]);
        } else {
            setSelectedVoice(null);
        }
    }, [voices, targetLang]);

    const [interimTranscript, setInterimTranscript] = useState('');

    // Initialize Speech Recognition
    useEffect(() => {
        if ('webkitSpeechRecognition' in window) {
            const recognition = new window.webkitSpeechRecognition();
            recognition.continuous = true;
            recognition.interimResults = true;

            recognition.onresult = (event: any) => {
                let finalTrans = '';
                let interimTrans = '';

                for (let i = event.resultIndex; i < event.results.length; ++i) {
                    if (event.results[i].isFinal) {
                        finalTrans += event.results[i][0].transcript;
                    } else {
                        interimTrans += event.results[i][0].transcript;
                    }
                }

                if (finalTrans) {
                    setInputText(prev => prev ? `${prev} ${finalTrans}` : finalTrans);
                }
                setInterimTranscript(interimTrans);
            };

            recognition.onerror = (event: any) => {
                console.error("Speech recognition error", event.error);
                if (event.error === 'not-allowed') {
                    setIsListening(false);
                    setError("Microphone access denied.");
                }
            };

            recognition.onend = () => {
                // Only stop if user explicitly stopped it, otherwise it might just be a pause
                // But for simplicity, we'll let the user toggle it back on if it times out
                // NOTE: We keep isListening true in state to show UI, but if it actually stopped
                // we might need to click again. Let's sync state.
                if (isListening) {
                    setIsListening(false);
                }
            };

            recognitionRef.current = recognition;
        }
    }, []);

    // Update recognition language when source language changes
    useEffect(() => {
        if (recognitionRef.current) {
            recognitionRef.current.lang = sourceLang;
            // If we change lang while listening, restart
            if (isListening) {
                recognitionRef.current.stop();
                setTimeout(() => recognitionRef.current.start(), 100);
            }
        }
    }, [sourceLang, isListening]); // Added isListening to dependency array

    // Translation Effect
    useEffect(() => {
        if (timeoutRef.current) {
            clearTimeout(timeoutRef.current);
        }

        if (!inputText.trim()) {
            setTranslatedText('');
            return;
        }

        setIsLoading(true);
        setError(null);

        timeoutRef.current = setTimeout(async () => {
            try {
                const result = await translateText(inputText, `${LANGUAGES.find(l => l.code === sourceLang)?.name} to ${LANGUAGES.find(l => l.code === targetLang)?.name}`);
                setTranslatedText(result);
            } catch (err: any) {
                console.error(err);
                setError(err.message || 'Translation failed');
            } finally {
                setIsLoading(false);
            }
        }, 600); // Reduced debounce to 600ms for better responsiveness

        return () => {
            if (timeoutRef.current) clearTimeout(timeoutRef.current);
        };
    }, [inputText, targetLang, sourceLang]);

    const handleSwapLanguages = () => {
        setSourceLang(targetLang);
        setTargetLang(sourceLang);
        setInputText(translatedText);
        setTranslatedText(inputText);
    };

    const toggleListening = () => {
        if (!recognitionRef.current) {
            alert("Speech recognition not supported in this browser.");
            return;
        }

        if (isListening) {
            recognitionRef.current.stop();
            setIsListening(false);
        } else {
            try {
                recognitionRef.current.start();
                setIsListening(true);
                setError(null);
            } catch (e) {
                console.error(e);
            }
        }
    };

    const speakText = async (text: string, lang: string, voice?: SpeechSynthesisVoice | null | 'native') => {
        if (!text) return;
        window.speechSynthesis.cancel();

        if (voice === 'native') {
            console.log("Speaking with Native Piper Voice:", text);
            try {
                await playPiper(text);
            } catch (e) {
                console.error("Piper error:", e);
                alert("Native voice not ready or failed to load. Falling back to system.");
            }
            return;
        }

        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = lang;
        if (voice && typeof voice !== 'string') {
            utterance.voice = voice;
        }
        window.speechSynthesis.speak(utterance);
    };

    return (
        <div style={{ maxWidth: '800px', margin: '2rem auto', padding: '20px', borderRadius: '12px', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)', backgroundColor: '#ffffff', fontFamily: 'Inter, system-ui, sans-serif' }}>
            <h2 style={{ textAlign: 'center', color: '#111827', marginBottom: '2rem', fontSize: '1.5rem', fontWeight: 'bold' }}>
                AI Real-Time Translator
            </h2>

            {/* Language Controls */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '1rem', marginBottom: '2rem', flexWrap: 'wrap' }}>
                <select
                    value={sourceLang}
                    onChange={(e) => setSourceLang(e.target.value)}
                    style={selectStyle}
                >
                    {LANGUAGES.map(lang => (
                        <option key={`source-${lang.code}`} value={lang.code}>{lang.name}</option>
                    ))}
                </select>

                <button
                    onClick={handleSwapLanguages}
                    style={iconButtonStyle}
                    title="Swap Languages"
                >
                    ⇄
                </button>

                <select
                    value={targetLang}
                    onChange={(e) => setTargetLang(e.target.value)}
                    style={selectStyle}
                >
                    {LANGUAGES.map(lang => (
                        <option key={`target-${lang.code}`} value={lang.code}>{lang.name}</option>
                    ))}
                </select>
            </div>

            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '2rem' }}>
                {/* Input Section */}
                <div style={{ ...sectionStyle, flex: '1 1 300px' }}>
                    <div style={headerWithIconStyle}>
                        <label style={labelStyle}>Input ({LANGUAGES.find(l => l.code === sourceLang)?.name})</label>
                        <button
                            onClick={toggleListening}
                            style={{ ...iconButtonStyle, backgroundColor: isListening ? '#fee2e2' : 'transparent', color: isListening ? '#dc2626' : '#6b7280', animation: isListening ? 'pulse 1.5s infinite' : 'none' }}
                            title={isListening ? "Stop Listening" : "Start Voice Input"}
                        >
                            {isListening ? '⏺' : '🎤'}
                        </button>
                    </div>
                    <div style={{ position: 'relative' }}>
                        <textarea
                            value={inputText}
                            onChange={(e) => setInputText(e.target.value)}
                            placeholder="Type or speak..."
                            rows={8}
                            style={textareaStyle}
                        />
                        {isListening && interimTranscript && (
                            <div style={{ position: 'absolute', bottom: '1rem', left: '1rem', right: '1rem', color: '#9ca3af', fontStyle: 'italic', pointerEvents: 'none' }}>
                                {interimTranscript}
                            </div>
                        )}
                    </div>
                    <div style={footerStyle}>
                        <button onClick={() => speakText(inputText, sourceLang)} style={miniButtonStyle}>🔊 Listen</button>
                        <button onClick={() => setInputText('')} style={miniButtonStyle}>🗑️ Clear</button>
                    </div>
                </div>
                {/* Output Section */}
                <div style={{ ...sectionStyle, flex: '1 1 300px' }}>
                    <div style={headerWithIconStyle}>
                        <label style={labelStyle}>Translation ({LANGUAGES.find(l => l.code === targetLang)?.name})</label>
                    </div>
                    <div style={{ ...textareaStyle, backgroundColor: '#f9fafb', position: 'relative' }}>
                        {isLoading && <span style={loadingStyle}>Translating...</span>}
                        {error ? <span style={{ color: '#dc2626' }}>{error}</span> : translatedText}
                    </div>
                    <div style={footerStyle}>
                        {voices.filter(v => v.lang.startsWith(targetLang)).length > 0 && (
                            <select
                                value={(selectedVoice as any) === 'native' ? 'native' : selectedVoice?.name || ''}
                                onChange={(e) => {
                                    if (e.target.value === 'native') {
                                        setSelectedVoice('native' as any);
                                    } else {
                                        const voice = voices.find(v => v.name === e.target.value);
                                        setSelectedVoice(voice || null);
                                    }
                                }}
                                style={{ ...miniButtonStyle, maxWidth: '200px' }}
                            >
                                {targetLang === 'es' && (
                                    <option value="native">🇲🇽 Native (Mexican Spanish)</option>
                                )}
                                {voices.filter(v => v.lang.startsWith(targetLang)).map(v => (
                                    <option key={v.name} value={v.name}>{v.name.slice(0, 30)}...</option>
                                ))}
                            </select>
                        )}
                        <button onClick={() => speakText(translatedText, targetLang, selectedVoice)} style={miniButtonStyle}>🔊 Listen</button>
                        <button onClick={() => { navigator.clipboard.writeText(translatedText) }} style={miniButtonStyle}>📋 Copy</button>
                    </div>
                </div>
            </div>
        </div>
    );
};

// Styles
const selectStyle = {
    padding: '0.5rem 1rem',
    borderRadius: '6px',
    border: '1px solid #d1d5db',
    backgroundColor: '#fff',
    fontSize: '0.95rem',
    outline: 'none',
    cursor: 'pointer'
};

const sectionStyle = {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '0.5rem'
};

const textareaStyle = {
    width: '100%',
    padding: '1rem',
    borderRadius: '8px',
    border: '1px solid #e5e7eb',
    resize: 'none' as const,
    fontSize: '1rem',
    lineHeight: '1.5',
    outline: 'none',
    height: '200px',
    fontFamily: 'inherit',
    boxSizing: 'border-box' as const
};

const labelStyle = {
    fontWeight: 600,
    color: '#374151',
    fontSize: '0.9rem'
};

const iconButtonStyle = {
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    fontSize: '1.25rem',
    padding: '0.5rem',
    borderRadius: '50%',
    transition: 'background-color 0.2s',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center'
};

const headerWithIconStyle = {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '0.5rem'
};

const footerStyle = {
    display: 'flex',
    gap: '0.5rem',
    justifyContent: 'flex-end',
    marginTop: '0.5rem'
};

const miniButtonStyle = {
    background: 'none',
    border: '1px solid #e5e7eb',
    borderRadius: '4px',
    padding: '0.25rem 0.5rem',
    fontSize: '0.8rem',
    cursor: 'pointer',
    color: '#4b5563',
    transition: 'all 0.2s'
};

const loadingStyle = {
    position: 'absolute' as const,
    top: '1rem',
    right: '1rem',
    fontSize: '0.8rem',
    color: '#9ca3af',
    fontStyle: 'italic'
};
