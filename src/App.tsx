import { useState } from 'react';
import './App.css';
import { RealTimeTranslator } from './components/RealTimeTranslator';
import { ChatManager } from './components/Chat/ChatManager';

function App() {
  const [view, setView] = useState<'translator' | 'chat'>('translator');

  return (
    <div className="App">
      <nav style={{ padding: '1rem', background: '#f3f4f6', display: 'flex', justifyContent: 'center', gap: '1rem', marginBottom: '1rem' }}>
        <button
          onClick={() => setView('translator')}
          style={{ padding: '0.5rem 1rem', borderRadius: '6px', border: 'none', background: view === 'translator' ? '#2563eb' : 'white', color: view === 'translator' ? 'white' : 'black', cursor: 'pointer' }}
        >
          Speech Translator
        </button>
        <button
          onClick={() => setView('chat')}
          style={{ padding: '0.5rem 1rem', borderRadius: '6px', border: 'none', background: view === 'chat' ? '#2563eb' : 'white', color: view === 'chat' ? 'white' : 'black', cursor: 'pointer' }}
        >
          WhatsApp Chat
        </button>
      </nav>

      {view === 'translator' ? <RealTimeTranslator /> : <ChatManager />}
    </div>
  );
}

export default App
