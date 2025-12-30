
import React, { useState, useEffect, useRef } from 'react';
import type { ChatMessage, PeerUser } from './types';

interface ChatInterfaceProps {
    user: PeerUser;
    remoteUser: PeerUser | null;
    messages: ChatMessage[];
    onSendMessage: (text: string) => void;
    myPeerId: string;
    connectionError: string | null;
}

export const ChatInterface: React.FC<ChatInterfaceProps> = ({
    user,
    remoteUser,
    messages,
    onSendMessage,
    myPeerId,
    connectionError
}) => {
    const [input, setInput] = useState('');
    const messagesEndRef = useRef<HTMLDivElement>(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    const handleSend = (e: React.FormEvent) => {
        e.preventDefault();
        if (input.trim()) {
            onSendMessage(input);
            setInput('');
        }
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
                {!remoteUser && (
                    <button onClick={copyCode} style={{ background: 'white', color: '#075e54', border: 'none', padding: '0.5rem 1rem', borderRadius: '20px', fontWeight: 'bold', cursor: 'pointer' }}>
                        Copy Room Code: {myPeerId.slice(0, 5)}...
                    </button>
                )}
            </div>

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

                            <div style={{ fontSize: '1rem', color: '#303030' }}>
                                {isMe ? msg.text : (msg.translatedText || msg.text)}
                            </div>

                            {/* Show original if translated */}
                            {!isMe && msg.translatedText && (
                                <div style={{ fontSize: '0.75rem', color: '#888', fontStyle: 'italic', marginTop: '4px', borderTop: '1px solid #eee', paddingTop: '4px' }}>
                                    Original: {msg.text}
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
                <input
                    type="text"
                    value={input}
                    onChange={e => setInput(e.target.value)}
                    placeholder="Type a message..."
                    style={{ flex: 1, padding: '0.75rem', borderRadius: '20px', border: 'none', outline: 'none' }}
                />
                <button
                    type="submit"
                    disabled={!remoteUser}
                    style={{ background: remoteUser ? '#075e54' : '#ccc', color: 'white', border: 'none', borderRadius: '50%', width: '45px', height: '45px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: remoteUser ? 'pointer' : 'not-allowed' }}
                >
                    ➤
                </button>
            </form>
        </div>
    );
};
