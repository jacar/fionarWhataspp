
import { useState, useEffect, useRef } from 'react';
import Peer from 'peerjs';
import type { DataConnection, MediaConnection } from 'peerjs';
import type { ChatMessage, PeerUser } from '../components/Chat/types';

export const usePeerChat = (user: PeerUser) => {
    const [peerId, setPeerId] = useState<string>('');
    const [connection, setConnection] = useState<DataConnection | null>(null);
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [isConnected, setIsConnected] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Remote peer info
    const [remoteUser, setRemoteUser] = useState<PeerUser | null>(null);

    // Media Streams
    const [localStream, setLocalStream] = useState<MediaStream | null>(null);
    const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
    const [call, setCall] = useState<MediaConnection | null>(null);
    const [isCalling, setIsCalling] = useState(false);

    const peerRef = useRef<Peer | null>(null);

    // Initialize Peer
    useEffect(() => {
        const newPeer = new Peer();

        newPeer.on('open', (id) => {
            console.log('My peer ID is: ' + id);
            setPeerId(id);
        });

        newPeer.on('connection', (conn) => {
            console.log('Incoming data connection from:', conn.peer);
            setupConnection(conn);
        });

        newPeer.on('call', (incomingCall) => {
            console.log('Incoming call from:', incomingCall.peer);
            setCall(incomingCall);
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
            senderId: peerRef.current?.id || user.id,
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

    const startCall = async () => {
        if (!peerRef.current || !connection) return;
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
            setLocalStream(stream);

            const newCall = peerRef.current.call(connection.peer, stream);
            setIsCalling(true);
            setCall(newCall);

            newCall.on('stream', (remote) => {
                setRemoteStream(remote);
            });

            newCall.on('close', () => {
                endCall();
            });
        } catch (err) {
            console.error("Failed to get local stream", err);
            setError("Could not access camera/microphone");
        }
    };

    const answerCall = async () => {
        if (!call) return;
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
            setLocalStream(stream);
            call.answer(stream);
            setIsCalling(true);

            call.on('stream', (remote) => {
                setRemoteStream(remote);
            });
        } catch (err) {
            console.error("Failed to answer call", err);
            setError("Could not access camera/microphone");
        }
    };

    const endCall = () => {
        if (call) call.close();
        if (localStream) {
            localStream.getTracks().forEach(track => track.stop());
        }
        setCall(null);
        setLocalStream(null);
        setRemoteStream(null);
        setIsCalling(false);
    };

    return {
        myPeerId: peerId,
        connectToPeer,
        sendMessage,
        messages,
        isConnected,
        error,
        remoteUser,
        startCall,
        answerCall,
        endCall,
        localStream,
        remoteStream,
        incomingCall: !!call && !isCalling,
        isCalling
    };
};
