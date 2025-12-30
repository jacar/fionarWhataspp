
export interface ChatMessage {
    id: string;
    senderId: string;
    senderName: string;
    text: string;
    translatedText?: string;
    timestamp: number;
    isSystem?: boolean;
    originalLang: string;
    targetLang?: string;
}

export interface PeerUser {
    id: string; // Peer ID
    name: string;
    nativeLang: string;
}
