
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
        error,
        startCall,
        answerCall,
        endCall,
        localStream,
        remoteStream,
        incomingCall,
        isCalling
    } = usePeerChat(user);

    // Auto-connect if joining
    React.useEffect(() => {
        if (initialRemoteId && myPeerId) {
            connectToPeer(initialRemoteId);
        }
    }, [initialRemoteId, myPeerId]);

    const handleSendMessage = async (text: string) => {
        let translated = undefined;

        if (remoteUser && remoteUser.nativeLang !== user.nativeLang) {
            // Map code to Name
            const langMap: Record<string, string> = {
                'es-ES': 'Spanish',
                'en-US': 'English',
                'fr-FR': 'French',
                'de-DE': 'German',
                'pt-PT': 'Portuguese'
            };

            const targetName = langMap[remoteUser.nativeLang] || remoteUser.nativeLang;

            console.log(`Chat: Translating "${text}" to ${targetName}`);
            try {
                translated = await translateText(text, targetName);
                console.log(`Chat: Translation result: ${translated}`);
            } catch (e) {
                console.error("Chat translation failed:", e);
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
            onStartCall={startCall}
            onAnswerCall={answerCall}
            onEndCall={endCall}
            localStream={localStream}
            remoteStream={remoteStream}
            isCalling={isCalling}
            incomingCall={incomingCall}
        />
    );
};
