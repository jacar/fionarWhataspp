
import { useState, useEffect, useRef } from 'react';
import Peer from 'peerjs';
import type { DataConnection } from 'peerjs';
import type { ChatMessage, PeerUser } from '../components/Chat/types';

export const usePeerChat = (user: PeerUser) => {
    const [peerId, setPeerId] = useState<string>('');
    const [connection, setConnection] = useState<DataConnection | null>(null);
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [isConnected, setIsConnected] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Remote peer info
    const [remoteUser, setRemoteUser] = useState<PeerUser | null>(null);

    const peerRef = useRef<Peer | null>(null);

    // Initialize Peer
    useEffect(() => {
        const newPeer = new Peer();

        newPeer.on('open', (id) => {
            console.log('My peer ID is: ' + id);
            setPeerId(id);
        });

        newPeer.on('connection', (conn) => {
            console.log('Incoming connection from:', conn.peer);
            setupConnection(conn);
        });

        newPeer.on('error', (err) => {
            console.error('Peer error:', err);
            setError(err.message);
        });

        peerRef.current = newPeer;

        return () => {
            newPeer.destroy();
        };
    }, []);

    const setupConnection = (conn: DataConnection) => {
        conn.on('open', () => {
            console.log('Connection opened');
            setIsConnected(true);
            setConnection(conn);

            // Send our handshake info
            conn.send({
                type: 'handshake',
                user: user
            });
        });

        conn.on('data', (data: any) => {
            console.log('Received data:', data);

            if (data.type === 'handshake') {
                setRemoteUser(data.user);
            } else if (data.type === 'message') {
                addMessage(data.message);
            }
        });

        conn.on('close', () => {
            console.log('Connection closed');
            setIsConnected(false);
            setConnection(null);
            setRemoteUser(null);
        });

        conn.on('error', (err) => {
            console.error("Connection error:", err);
            setError("Connection lost");
        });
    };

    const connectToPeer = (remotePeerId: string) => {
        if (!peerRef.current) return;
        const conn = peerRef.current.connect(remotePeerId);
        setupConnection(conn);
    };

    const addMessage = (msg: ChatMessage) => {
        setMessages(prev => [...prev, msg]);
    };

    const sendMessage = (text: string, translatedText?: string) => {
        if (!connection || !isConnected) return;

        const newMessage: ChatMessage = {
            id: Date.now().toString(),
            senderId: user.id, // technically we don't know our own ID until peer opens. 
            // Actually user.id passed in might be just a temp ID. 
            // Let's use peerRef.current.id
            senderName: user.name,
            text: text,
            translatedText: translatedText,
            timestamp: Date.now(),
            originalLang: user.nativeLang
        };

        // Send to peer
        connection.send({
            type: 'message',
            message: newMessage
        });

        // Add to own list
        addMessage(newMessage);
    };

    return {
        myPeerId: peerId,
        connectToPeer,
        sendMessage,
        messages,
        isConnected,
        error,
        remoteUser
    };
};
