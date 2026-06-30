import { io, Socket } from 'socket.io-client';
import { getAppOrigin } from './config';
import { UserProfile, FileMetadata } from '../types';

type RTCEvents = {
  onPeerConnected: (peerId: string, peerUser: UserProfile) => void;
  onPeerDisconnected: (peerId: string) => void;
  onFileStart: (meta: FileMetadata) => void;
  onFileProgress: (fileId: string, progress: number) => void;
  onFileComplete: (fileId: string, blob: Blob) => void;
};

export class WebRTCManager {
  private socket: Socket;
  private peerConnections: Map<string, RTCPeerConnection> = new Map();
  private dataChannels: Map<string, RTCDataChannel> = new Map();
  
  // File receiving state
  private receivingFiles: Map<string, { meta: FileMetadata, chunks: ArrayBuffer[], receivedSize: number }> = new Map();
  
  constructor(private roomId: string, private user: UserProfile, private events: RTCEvents) {
    this.socket = io(getAppOrigin());
    
    this.socket.on('connect', () => {
      this.socket.emit('join-room', this.roomId, this.user);
    });

    this.socket.on('room-peers', (peers: {id: string, user: UserProfile}[]) => {
      peers.forEach(peer => {
        this.createPeerConnection(peer.id, true);
        this.events.onPeerConnected(peer.id, peer.user);
      });
    });

    this.socket.on('user-joined', (peerId: string, peerUser: UserProfile) => {
      this.createPeerConnection(peerId, false);
      this.events.onPeerConnected(peerId, peerUser);
    });

    this.socket.on('user-left', (peerId: string) => {
      this.peerConnections.get(peerId)?.close();
      this.peerConnections.delete(peerId);
      this.dataChannels.delete(peerId);
      this.events.onPeerDisconnected(peerId);
    });

    this.socket.on('offer', async (peerId: string, offer: RTCSessionDescriptionInit, peerUser: UserProfile) => {
      const pc = this.createPeerConnection(peerId, false);
      await pc.setRemoteDescription(new RTCSessionDescription(offer));
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      this.socket.emit('answer', peerId, answer);
    });

    this.socket.on('answer', async (peerId: string, answer: RTCSessionDescriptionInit) => {
      const pc = this.peerConnections.get(peerId);
      if (pc) {
        await pc.setRemoteDescription(new RTCSessionDescription(answer));
      }
    });

    this.socket.on('ice-candidate', async (peerId: string, candidate: RTCIceCandidateInit) => {
      const pc = this.peerConnections.get(peerId);
      if (pc) {
        await pc.addIceCandidate(new RTCIceCandidate(candidate));
      }
    });
  }

  private createPeerConnection(peerId: string, isInitiator: boolean) {
    if (this.peerConnections.has(peerId)) return this.peerConnections.get(peerId)!;

    const pc = new RTCPeerConnection({
      iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
    });

    pc.onicecandidate = (event) => {
      if (event.candidate) {
        this.socket.emit('ice-candidate', peerId, event.candidate);
      }
    };

    if (isInitiator) {
      const dc = pc.createDataChannel('fileTransfer');
      this.setupDataChannel(peerId, dc);
      
      pc.createOffer().then(offer => {
        return pc.setLocalDescription(offer);
      }).then(() => {
        this.socket.emit('offer', peerId, pc.localDescription);
      });
    } else {
      pc.ondatachannel = (event) => {
        this.setupDataChannel(peerId, event.channel);
      };
    }

    this.peerConnections.set(peerId, pc);
    return pc;
  }

  private setupDataChannel(peerId: string, dc: RTCDataChannel) {
    dc.binaryType = 'arraybuffer';
    
    dc.onopen = () => {
      console.log('Data channel open with', peerId);
      this.dataChannels.set(peerId, dc);
    };

    let currentReceivingFileId: string | null = null;

    dc.onmessage = (event) => {
      if (typeof event.data === 'string') {
        const msg = JSON.parse(event.data);
        if (msg.type === 'file-start') {
          const meta = msg.meta as FileMetadata;
          currentReceivingFileId = meta.id;
          this.receivingFiles.set(meta.id, { meta, chunks: [], receivedSize: 0 });
          this.events.onFileStart(meta);
        }
      } else if (event.data instanceof ArrayBuffer && currentReceivingFileId) {
        const fileState = this.receivingFiles.get(currentReceivingFileId);
        if (!fileState) return;

        fileState.chunks.push(event.data);
        fileState.receivedSize += event.data.byteLength;
        
        this.events.onFileProgress(currentReceivingFileId, fileState.receivedSize / fileState.meta.size);

        if (fileState.receivedSize >= fileState.meta.size) {
          const blob = new Blob(fileState.chunks, { type: fileState.meta.type });
          this.events.onFileComplete(currentReceivingFileId, blob);
          this.receivingFiles.delete(currentReceivingFileId);
          currentReceivingFileId = null;
        }
      }
    };
  }

  public async sendFile(file: File, onProgress: (progress: number) => void) {
    if (this.dataChannels.size === 0) throw new Error("No peers connected");
    const dc = Array.from(this.dataChannels.values())[0]; // Send to first connected peer for simplicity
    
    if (dc.readyState !== 'open') throw new Error("Data channel not open");

    const fileId = Math.random().toString(36).substring(2, 9);
    const meta: FileMetadata = {
      id: fileId,
      name: file.name,
      size: file.size,
      type: file.type || 'application/octet-stream'
    };

    dc.send(JSON.stringify({ type: 'file-start', meta }));

    const chunkSize = 64 * 1024; // 64KB
    let offset = 0;

    const readAndSendNextChunk = () => {
      const reader = new FileReader();
      const slice = file.slice(offset, offset + chunkSize);
      
      reader.onload = () => {
        if (dc.readyState !== 'open') return;
        
        if (dc.bufferedAmount > 1024 * 1024) { // Buffer > 1MB, wait
          setTimeout(readAndSendNextChunk, 50);
          return;
        }

        dc.send(reader.result as ArrayBuffer);
        offset += slice.size;
        
        onProgress(offset / file.size);

        if (offset < file.size) {
          readAndSendNextChunk();
        }
      };
      
      reader.readAsArrayBuffer(slice);
    };

    readAndSendNextChunk();
    return fileId;
  }

  public disconnect() {
    this.peerConnections.forEach(pc => pc.close());
    this.socket.disconnect();
  }
}
