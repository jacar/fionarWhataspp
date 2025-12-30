
import React, { useState } from 'react';
import { JoinRoom } from './JoinRoom';
import { ChatInterface } from './ChatInterface';
import { usePeerChat } from '../../hooks/usePeerChat';
import { translateText } from '../../services/groqTranslator';
import type { PeerUser } from './types';

export const ChatManager: React.FC = () => {
    const [user, setUser] = useState<PeerUser | null>(null);
    const [joinRemoteId, setJoinRemoteId] = useState<string | null>(null);

    // We conditionally call the hook only after we have a user (conceptually).
    // But hooks shouldn't be conditional. 
    // So we'll render a wrapper CHILD that calls the hook.

    if (!user) {
        return (
            <JoinRoom onJoin={(name, lang, remoteId) => {
                setUser({ id: '', name, nativeLang: lang }); // ID set later or by hook? Hook manages peerId. 
                if (remoteId) setJoinRemoteId(remoteId);
            }} />
        );
    }

    return <ConnectedChat user={user} initialRemoteId={joinRemoteId} />;
};

const ConnectedChat: React.FC<{ user: PeerUser, initialRemoteId: string | null }> = ({ user, initialRemoteId }) => {
    const {
        myPeerId,
        connectToPeer,
        sendMessage,
        messages,
        remoteUser,
        error
    } = usePeerChat(user);

    // Auto-connect if joining
    React.useEffect(() => {
        if (initialRemoteId && myPeerId) {
            connectToPeer(initialRemoteId);
        }
    }, [initialRemoteId, myPeerId]);

    const handleSendMessage = async (text: string) => {
        // Translate for the remote user first?
        // STRATEGY: Send original text + target text.
        // Or translate locally and send both.

        let translated = undefined;
        if (remoteUser && remoteUser.nativeLang !== user.nativeLang) {
            console.log(`Translating ${text} from ${user.nativeLang} to ${remoteUser.nativeLang}`);
            try {
                // We need full language names for Groq prompt ideally, but codes might work.
                // Let's use a quick map or rely on Groq handling ISO codes (it usually does ok).
                // Better: Reuse LANGUAGES map from Translator.
                translated = await translateText(text, `${user.nativeLang} to ${remoteUser.nativeLang}`);
            } catch (e) {
                console.error("Translation fail", e);
            }
        }

        sendMessage(text, translated);
    };

    return (
        <ChatInterface
            user={user}
            remoteUser={remoteUser}
            messages={messages}
            onSendMessage={handleSendMessage}
            myPeerId={myPeerId}
            connectionError={error}
        />
    );
};
