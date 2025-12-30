
import React, { useState } from 'react';

interface JoinRoomProps {
    onJoin: (name: string, lang: string, remotePeerId?: string) => void;
}

export const JoinRoom: React.FC<JoinRoomProps> = ({ onJoin }) => {
    const [name, setName] = useState('');
    const [lang, setLang] = useState('es');
    const [action, setAction] = useState<'create' | 'join'>('create');
    const [remoteId, setRemoteId] = useState('');

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!name) return;
        onJoin(name, lang, action === 'join' ? remoteId : undefined);
    };

    return (
        <div style={{ maxWidth: '400px', margin: '2rem auto', padding: '20px', borderRadius: '12px', background: 'white', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)', fontFamily: 'Inter, sans-serif' }}>
            <h2 style={{ textAlign: 'center', marginBottom: '1.5rem' }}>💬 Global Chat</h2>

            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div>
                    <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600 }}>Your Name</label>
                    <input
                        type="text"
                        value={name}
                        onChange={e => setName(e.target.value)}
                        placeholder="Ex: Juan"
                        style={{ width: '100%', padding: '0.5rem', borderRadius: '6px', border: '1px solid #ddd' }}
                        required
                    />
                </div>

                <div>
                    <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600 }}>Your Native Language</label>
                    <select
                        value={lang}
                        onChange={e => setLang(e.target.value)}
                        style={{ width: '100%', padding: '0.5rem', borderRadius: '6px', border: '1px solid #ddd' }}
                    >
                        <option value="es">Spanish (Español)</option>
                        <option value="en">English (English)</option>
                        <option value="fr">French (Français)</option>
                        <option value="de">German (Deutsch)</option>
                        <option value="pt">Portuguese (Português)</option>
                    </select>
                </div>

                <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
                    <button
                        type="button"
                        onClick={() => setAction('create')}
                        style={{ flex: 1, padding: '0.5rem', borderRadius: '6px', border: 'none', background: action === 'create' ? '#2563eb' : '#e5e7eb', color: action === 'create' ? 'white' : 'black', cursor: 'pointer' }}
                    >
                        Create Room
                    </button>
                    <button
                        type="button"
                        onClick={() => setAction('join')}
                        style={{ flex: 1, padding: '0.5rem', borderRadius: '6px', border: 'none', background: action === 'join' ? '#2563eb' : '#e5e7eb', color: action === 'join' ? 'white' : 'black', cursor: 'pointer' }}
                    >
                        Join Room
                    </button>
                </div>

                {action === 'join' && (
                    <div>
                        <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600 }}>Room Code (Peer ID)</label>
                        <input
                            type="text"
                            value={remoteId}
                            onChange={e => setRemoteId(e.target.value)}
                            placeholder="Enter the code shared with you"
                            style={{ width: '100%', padding: '0.5rem', borderRadius: '6px', border: '1px solid #ddd' }}
                            required
                        />
                    </div>
                )}

                <button
                    type="submit"
                    style={{ marginTop: '1rem', padding: '0.75rem', borderRadius: '6px', border: 'none', background: '#10b981', color: 'white', fontWeight: 'bold', cursor: 'pointer' }}
                >
                    {action === 'create' ? 'Start & Get Code' : 'Join Chat'}
                </button>
            </form>
        </div>
    );
};
