
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

        console.log("Chat: Attempting to send message:", text);
        console.log("Chat: Remote user state:", remoteUser);

        if (remoteUser) {
            const myLang = user.nativeLang.split('-')[0].toLowerCase();
            const targetLang = remoteUser.nativeLang.split('-')[0].toLowerCase();

            if (myLang !== targetLang) {
                // Map common codes to full names for the AI
                const langMap: Record<string, string> = {
                    'es': 'Spanish',
                    'en': 'English',
                    'fr': 'French',
                    'de': 'German',
                    'pt': 'Portuguese',
                    'it': 'Italian'
                };

                const targetName = langMap[targetLang] || remoteUser.nativeLang;

                console.log(`Chat: Translating from ${myLang} to ${targetName}`);
                try {
                    translated = await translateText(text, targetName);
                    if (!translated) {
                        console.warn("Chat: Translation returned empty string");
                    } else {
                        console.log(`Chat: Translation success: ${translated}`);
                    }
                } catch (e: any) {
                    console.error("Chat: Translation error:", e.message);
                    // We still send the message but without translation
                }
            } else {
                console.log("Chat: Skipping translation (same language family)");
            }
        } else {
            console.warn("Chat: Cannot translate, remoteUser is null");
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
