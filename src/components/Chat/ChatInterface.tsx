
import React, { useState, useEffect, useRef } from 'react';
import type { ChatMessage, PeerUser } from './types';

interface ChatInterfaceProps {
    user: PeerUser;
    remoteUser: PeerUser | null;
    messages: ChatMessage[];
    onSendMessage: (text: string) => void;
    myPeerId: string;
    connectionError: string | null;

    // Media Props
    onStartCall: () => void;
    onAnswerCall: () => void;
    onEndCall: () => void;
    localStream: MediaStream | null;
    remoteStream: MediaStream | null;
    isCalling: boolean;
    incomingCall: boolean;
}

export const ChatInterface: React.FC<ChatInterfaceProps> = ({
    user,
    remoteUser,
    messages,
    onSendMessage,
    myPeerId,
    connectionError,
    onStartCall,
    onAnswerCall,
    onEndCall,
    localStream,
    remoteStream,
    isCalling,
    incomingCall
}) => {
    const [input, setInput] = useState('');
    const [isListening, setIsListening] = useState(false);
    const recognitionRef = useRef<any>(null);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    const localVideoRef = useRef<HTMLVideoElement>(null);
    const remoteVideoRef = useRef<HTMLVideoElement>(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    // Media Stream Effects
    useEffect(() => {
        if (localVideoRef.current && localStream) {
            localVideoRef.current.srcObject = localStream;
        }
    }, [localStream]);

    useEffect(() => {
        if (remoteVideoRef.current && remoteStream) {
            remoteVideoRef.current.srcObject = remoteStream;
        }
    }, [remoteStream]);

    // Speech Recognition Setup
    useEffect(() => {
        if ('webkitSpeechRecognition' in window) {
            const recognition = new (window as any).webkitSpeechRecognition();
            recognition.continuous = true;
            recognition.interimResults = true;
            recognition.lang = user.nativeLang;

            recognition.onresult = (event: any) => {
                let finalTranscript = '';
                let interimTranscript = '';

                for (let i = 0; i < event.results.length; ++i) {
                    const transcript = event.results[i][0].transcript;
                    if (event.results[i].isFinal) {
                        finalTranscript += transcript;
                    } else {
                        interimTranscript += transcript;
                    }
                }

                // Update input with the combination of final and current interim
                if (finalTranscript || interimTranscript) {
                    setInput(finalTranscript + interimTranscript);
                }
            };

            recognition.onerror = (err: any) => {
                console.error("Speech Recognition Error", err);
                setIsListening(false);
            };

            recognition.onend = () => setIsListening(false);
            recognitionRef.current = recognition;
        }
    }, [user.nativeLang]);

    const handleSend = (e: React.FormEvent) => {
        e.preventDefault();
        if (input.trim()) {
            onSendMessage(input);
            setInput('');
        }
    };

    const toggleListening = () => {
        if (!recognitionRef.current) return;
        if (isListening) {
            recognitionRef.current.stop();
        } else {
            recognitionRef.current.start();
            setIsListening(true);
        }
    };

    const speak = (text: string, lang: string) => {
        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = lang;
        window.speechSynthesis.speak(utterance);
    };

    const copyCode = () => {
        navigator.clipboard.writeText(myPeerId);
        alert("Room Code copied!");
    };

    return (
        <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', maxWidth: '600px', margin: '0 auto', background: '#e5ddd5', fontFamily: 'Inter, sans-serif' }}>
            {/* Header */}
            <div style={{ padding: '1rem', background: '#075e54', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'space-between', boxShadow: '0 1px 3px rgba(0,0,0,0.2)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: '#ccc', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.2rem' }}>
                        👤
                    </div>
                    <div>
                        <div style={{ fontWeight: 'bold' }}>{remoteUser ? remoteUser.name : 'Waiting for partner...'}</div>
                        <div style={{ fontSize: '0.8rem', opacity: 0.8 }}>
                            {remoteUser ? `Speaking: ${remoteUser.nativeLang}` : 'Share code to connect'}
                        </div>
                    </div>
                </div>

                <div style={{ display: 'flex', gap: '1rem' }}>
                    {remoteUser && !isCalling && !incomingCall && (
                        <button onClick={onStartCall} style={headerButtonStyle}>📹 Call</button>
                    )}
                    {incomingCall && (
                        <button onClick={onAnswerCall} style={{ ...headerButtonStyle, background: '#10b981' }}>📞 Answer</button>
                    )}
                    {isCalling && (
                        <button onClick={onEndCall} style={{ ...headerButtonStyle, background: '#ef4444' }}>📵 End</button>
                    )}
                    {!remoteUser && (
                        <button onClick={copyCode} style={{ background: 'white', color: '#075e54', border: 'none', padding: '0.5rem 1rem', borderRadius: '20px', fontWeight: 'bold', cursor: 'pointer' }}>
                            Copy Room Code: {myPeerId.slice(0, 5)}...
                        </button>
                    )}
                </div>
            </div>

            {/* Video Overlay */}
            {isCalling && (
                <div style={{ position: 'fixed', inset: 0, zIndex: 50, background: 'black', display: 'flex', flexDirection: 'column' }}>
                    <div style={{ flex: 1, position: 'relative' }}>
                        <video ref={remoteVideoRef} autoPlay playsInline style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        <video ref={localVideoRef} autoPlay playsInline muted style={{ position: 'absolute', bottom: '1rem', right: '1rem', width: '150px', height: '200px', objectFit: 'cover', borderRadius: '8px', border: '2px solid white' }} />
                    </div>
                    <div style={{ padding: '1rem', display: 'flex', justifyContent: 'center' }}>
                        <button onClick={onEndCall} style={{ padding: '1rem 2rem', background: '#ef4444', color: 'white', border: 'none', borderRadius: '30px', fontWeight: 'bold' }}>
                            End Call
                        </button>
                    </div>
                </div>
            )}

            {/* Connection Error Banner */}
            {connectionError && (
                <div style={{ background: '#ef4444', color: 'white', padding: '0.5rem', textAlign: 'center', fontSize: '0.9rem' }}>
                    {connectionError}
                </div>
            )}

            {/* Messages Area */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '1rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <div style={{ textAlign: 'center', padding: '1rem', fontSize: '0.8rem', color: '#888', background: '#fff3', borderRadius: '8px', alignSelf: 'center', margin: '1rem 0' }}>
                    Messages are end-to-end encrypted and translated in real-time. 🔒
                </div>

                {messages.map((msg) => {
                    const isMe = msg.senderId === myPeerId || (msg.senderName === user.name && msg.senderId.length < 5); // Fallback check
                    // Actually checking senderId against myPeerId is safest if initialized correctly.

                    return (
                        <div
                            key={msg.id}
                            style={{
                                alignSelf: isMe ? 'flex-end' : 'flex-start',
                                maxWidth: '80%',
                                background: isMe ? '#dcf8c6' : 'white',
                                padding: '0.5rem 1rem',
                                borderRadius: '8px',
                                boxShadow: '0 1px 1px rgba(0,0,0,0.1)',
                                position: 'relative'
                            }}
                        >
                            {!isMe && <div style={{ fontSize: '0.75rem', color: '#e542a3', fontWeight: 'bold', marginBottom: '2px' }}>{msg.senderName}</div>}

                            <div style={{ fontSize: '1rem', color: '#303030', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                <span>{isMe ? msg.text : (msg.translatedText || msg.text)}</span>
                                <button
                                    onClick={() => speak(isMe ? msg.text : (msg.translatedText || msg.text), isMe ? user.nativeLang : (remoteUser?.nativeLang || 'en-US'))}
                                    style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.9rem', opacity: 0.6 }}
                                >
                                    🔊
                                </button>
                            </div>

                            {/* Show original if translated */}
                            {!isMe && msg.translatedText && (
                                <div style={{ fontSize: '0.75rem', color: '#888', fontStyle: 'italic', marginTop: '4px', borderTop: '1px solid #eee', paddingTop: '4px', display: 'flex', justifyContent: 'space-between' }}>
                                    <span>Original: {msg.text}</span>
                                    <button
                                        onClick={() => speak(msg.text, remoteUser?.nativeLang || 'es-ES')}
                                        style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.7rem', opacity: 0.5 }}
                                    >
                                        🔊
                                    </button>
                                </div>
                            )}

                            <div style={{ fontSize: '0.7rem', color: '#999', textAlign: 'right', marginTop: '4px' }}>
                                {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </div>
                        </div>
                    );
                })}
                <div ref={messagesEndRef} />
            </div>

            {/* Input Area */}
            <form onSubmit={handleSend} style={{ padding: '0.75rem', background: '#f0f0f0', display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                <button
                    type="button"
                    onClick={toggleListening}
                    style={{ background: isListening ? '#f44336' : '#fff', color: isListening ? 'white' : '#777', border: 'none', borderRadius: '50%', width: '40px', height: '40px', cursor: 'pointer', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}
                >
                    {isListening ? '🛑' : '🎤'}
                </button>
                <input
                    type="text"
                    value={input}
                    onChange={e => setInput(e.target.value)}
                    placeholder="Type a message..."
                    style={{ flex: 1, padding: '0.75rem', borderRadius: '20px', border: 'none', outline: 'none' }}
                />
                <button
                    type="submit"
                    disabled={!remoteUser || !input.trim()}
                    style={{ background: remoteUser && input.trim() ? '#075e54' : '#ccc', color: 'white', border: 'none', borderRadius: '50%', width: '45px', height: '45px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: remoteUser && input.trim() ? 'pointer' : 'not-allowed' }}
                >
                    ➤
                </button>
            </form>
        </div>
    );
};

const headerButtonStyle = {
    background: 'rgba(255,255,255,0.2)',
    color: 'white',
    border: 'none',
    padding: '0.5rem 1rem',
    borderRadius: '10px',
    cursor: 'pointer',
    fontWeight: 'bold',
    fontSize: '0.9rem'
};
