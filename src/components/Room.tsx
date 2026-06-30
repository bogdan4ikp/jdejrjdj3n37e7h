import { useState, useEffect, useRef, ChangeEvent } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ShieldCheck, Upload, File as FileIcon, CheckCircle2, ArrowLeft, Loader2, Download, X } from 'lucide-react';
import { UserProfile, FileMetadata, TransferStatus } from '../types';
import { WebRTCManager } from '../lib/webrtc';
import { formatBytes, cn } from '../lib/utils';
import ProfileModal from './ProfileModal';

type TransferData = TransferStatus & { meta: FileMetadata; file?: File; objectUrl?: string };

const containerVariants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.1 } }
};

const itemVariants = {
  hidden: { opacity: 0, y: 15 },
  show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 400, damping: 30 } }
};

export default function Room({ 
  roomId, 
  profile, 
  onLeave,
  onUpdateProfile
}: { 
  roomId: string;
  profile: UserProfile;
  onLeave: () => void;
  onUpdateProfile: (newProfile: UserProfile) => void;
}) {
  const [peer, setPeer] = useState<{ id: string, user: UserProfile } | null>(null);
  const [rtcManager, setRtcManager] = useState<WebRTCManager | null>(null);
  
  const [transfers, setTransfers] = useState<Map<string, TransferData>>(new Map());
  const [showProfile, setShowProfile] = useState<UserProfile | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const rtc = new WebRTCManager(roomId, profile, {
      onPeerConnected: (peerId, peerUser) => {
        setPeer({ id: peerId, user: peerUser });
        
        // Save to friends
        const storedFriends = localStorage.getItem('friends');
        let friends: UserProfile[] = storedFriends ? JSON.parse(storedFriends) : [];
        if (!friends.find(f => f.id === peerUser.id)) {
          friends.push(peerUser);
          localStorage.setItem('friends', JSON.stringify(friends));
        }
      },
      onPeerDisconnected: () => {
        setPeer(null);
      },
      onFileStart: (meta) => {
        setTransfers(prev => {
          const newMap = new Map<string, TransferData>(prev);
          newMap.set(meta.id, { fileId: meta.id, progress: 0, status: 'transferring', direction: 'receiving', meta });
          return newMap;
        });
      },
      onFileProgress: (fileId, progress) => {
        setTransfers(prev => {
          const newMap = new Map<string, TransferData>(prev);
          const t = newMap.get(fileId);
          if (t) {
            t.progress = progress;
          }
          return newMap;
        });
      },
      onFileComplete: (fileId, blob) => {
        setTransfers(prev => {
          const newMap = new Map<string, TransferData>(prev);
          const t = newMap.get(fileId);
          if (t) {
            t.status = 'completed';
            t.progress = 1;
            t.objectUrl = URL.createObjectURL(blob);
          }
          return newMap;
        });
      }
    });

    setRtcManager(rtc);

    return () => {
      rtc.disconnect();
    };
  }, [roomId, profile]);

  const handleFileSelect = async (e: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []) as File[];
    if (!files.length || !rtcManager) return;
    
    for (const file of files) {
      try {
        const fileId = Math.random().toString(36).substring(2, 9);
        const meta: FileMetadata = { id: fileId, name: file.name, size: file.size, type: file.type };
        
        setTransfers(prev => {
          const newMap = new Map<string, TransferData>(prev);
          newMap.set(fileId, { fileId, progress: 0, status: 'transferring', direction: 'sending', meta, file });
          return newMap;
        });

        await rtcManager.sendFile(file, (progress) => {
          setTransfers(prev => {
            const newMap = new Map<string, TransferData>(prev);
            const t = newMap.get(fileId);
            if (t) t.progress = progress;
            return newMap;
          });
        });

        setTransfers(prev => {
          const newMap = new Map<string, TransferData>(prev);
          const t = newMap.get(fileId);
          if (t) {
            t.status = 'completed';
            t.progress = 1;
          }
          return newMap;
        });
      } catch (err) {
        console.error("Failed to send file", err);
      }
    }
  };

  return (
    <motion.div 
      variants={containerVariants}
      initial="hidden"
      animate="show"
      className="flex flex-col min-h-screen p-6 bg-[#F2F2F7] text-[#1C1C1E] font-sans pb-24"
    >
      {/* Header */}
      <motion.div variants={itemVariants} className="flex justify-between items-center mb-8 mt-2 max-w-md mx-auto w-full">
        <button onClick={onLeave} className="flex items-center justify-center w-10 h-10 rounded-full bg-white shadow-sm border border-black/5 hover:bg-black/5 transition-colors">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="flex items-center gap-1.5 px-3 py-1.5 bg-black text-white rounded-full shadow-md">
          <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
          <span className="text-[10px] font-bold uppercase tracking-widest">AES-256 Активен</span>
        </div>
      </motion.div>

      <motion.div variants={itemVariants} className="flex flex-col items-center justify-center py-4 max-w-md mx-auto w-full">
        <div className="flex items-center justify-center gap-6 mb-10 bg-white/80 p-8 rounded-[40px] shadow-sm border border-black/5 w-full liquid-card">
          {/* Me */}
          <button onClick={() => setShowProfile(profile)} className="flex flex-col items-center gap-2 group">
            <div className="w-16 h-16 rounded-full overflow-hidden bg-gradient-to-br from-[#007AFF] to-[#5856D6] flex items-center justify-center text-white font-bold text-xl shadow-md group-hover:scale-105 transition-transform">
              {profile.avatar ? <img src={profile.avatar} alt="Me" className="w-full h-full object-cover" /> : profile.name.charAt(0).toUpperCase()}
            </div>
            <span className="text-[10px] font-bold uppercase tracking-widest text-black/40 group-hover:text-[#007AFF] transition-colors">{profile.name} (Вы)</span>
          </button>
          
          {/* Connection status */}
          <div className="flex flex-col items-center gap-2 px-2 flex-1">
            <div className="w-full h-1.5 bg-black/5 rounded-full relative overflow-hidden">
              <AnimatePresence>
                {peer && (
                  <motion.div 
                    initial={{ scaleX: 0 }}
                    animate={{ scaleX: 1 }}
                    className="absolute inset-0 bg-[#007AFF] origin-left"
                  />
                )}
              </AnimatePresence>
            </div>
          </div>

          {/* Peer */}
          <button onClick={() => peer && setShowProfile(peer.user)} disabled={!peer} className="flex flex-col items-center gap-2 group disabled:opacity-80">
            <div className={cn("w-16 h-16 rounded-full overflow-hidden flex items-center justify-center font-bold text-xl text-white transition-all", peer ? "bg-gradient-to-br from-[#5856D6] to-[#007AFF] shadow-md group-hover:scale-105" : "bg-black/5 border-2 border-dashed border-black/20 text-black/30")}>
              {peer ? (
                peer.user.avatar ? (
                  <img src={peer.user.avatar} alt="Peer" className="w-full h-full object-cover" />
                ) : (
                  peer.user.name.charAt(0).toUpperCase()
                )
              ) : (
                <Loader2 className="w-6 h-6 animate-spin" />
              )}
            </div>
            <span className={cn("text-[10px] font-bold uppercase tracking-widest transition-colors", peer ? "text-black/40 group-hover:text-[#5856D6]" : "text-black/30")}>{peer ? peer.user.name : 'Ожидание...'}</span>
          </button>
        </div>

        {peer ? (
          <motion.div variants={itemVariants} className="w-full flex flex-col gap-6">
            <button 
              onClick={() => fileInputRef.current?.click()}
              className="w-full py-8 bg-[#007AFF] text-white rounded-[32px] shadow-xl shadow-[#007AFF]/30 flex flex-col items-center justify-center gap-3 hover:bg-[#007AFF]/90 transition-all active:scale-[0.98] liquid-card"
            >
              <Upload className="w-8 h-8" />
              <div className="text-center">
                <p className="font-bold text-xl">Отправить файлы</p>
                <p className="text-white/70 text-sm mt-1">Фото, видео или документы</p>
              </div>
            </button>
            <input type="file" multiple ref={fileInputRef} onChange={handleFileSelect} className="hidden" />

            {/* Transfers List */}
            {transfers.size > 0 && (
              <div className="bg-white/60 backdrop-blur-xl rounded-[40px] p-8 border border-white shadow-sm mt-2 liquid-card">
                <h3 className="text-xs font-bold uppercase tracking-widest text-black/30 mb-6">Недавние передачи</h3>
                <div className="flex flex-col gap-4">
                  <AnimatePresence>
                    {Array.from(transfers.values()).map((t: TransferData) => (
                      <motion.div 
                        key={t.fileId} 
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        className="bg-white/80 border border-black/5 p-4 rounded-3xl flex flex-col gap-4 shadow-sm liquid-card overflow-hidden"
                      >
                        <div className="flex items-center gap-4">
                        <div className={cn("w-12 h-12 rounded-2xl flex items-center justify-center shrink-0", t.direction === 'sending' ? "bg-[#FF9500]/10 text-[#FF9500]" : "bg-[#5856D6]/10 text-[#5856D6]")}>
                          <FileIcon className="w-6 h-6" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-bold text-sm truncate text-[#1C1C1E]">{t.meta.name}</p>
                          <p className="text-[11px] text-black/40 mt-1 font-semibold">{formatBytes(t.meta.size)} • {t.direction === 'sending' ? 'Отправка' : 'Получение'}</p>
                        </div>
                        {t.status === 'completed' ? (
                          t.direction === 'receiving' && t.objectUrl ? (
                            <a 
                              href={t.objectUrl} 
                              download={t.meta.name}
                              className="text-[10px] font-bold text-[#007AFF] bg-[#007AFF]/10 px-3 py-1.5 rounded-full uppercase tracking-widest hover:bg-[#007AFF]/20 transition-colors"
                            >
                              Сохранить
                            </a>
                          ) : (
                            <span className="text-[10px] font-bold text-green-500 uppercase tracking-widest">Готово</span>
                          )
                        ) : (
                          <span className="text-xs font-bold text-[#007AFF]">{Math.round(t.progress * 100)}%</span>
                        )}
                      </div>
                      
                      {t.status !== 'completed' && (
                        <div className="w-full h-1.5 bg-black/5 rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-[#007AFF] transition-all duration-300" 
                            style={{ width: `${t.progress * 100}%` }}
                          />
                        </div>
                      )}
                    </motion.div>
                  ))}
                  </AnimatePresence>
                </div>
              </div>
            )}
          </motion.div>
        ) : (
          <motion.div variants={itemVariants} className="text-center p-10 bg-white/60 backdrop-blur-xl border border-white rounded-[40px] shadow-sm w-full liquid-card">
            <div className="w-20 h-20 bg-black text-white rounded-3xl mx-auto flex items-center justify-center mb-6 shadow-xl shadow-black/10">
              <ShieldCheck className="w-10 h-10" />
            </div>
            <p className="text-xl font-bold tracking-tight mb-2">Установка туннеля</p>
            <p className="text-black/50 text-sm">Ожидание подключения получателя...</p>
          </motion.div>
        )}
      </motion.div>

      <AnimatePresence>
        {showProfile && (
          <ProfileModal 
            key="profile-modal"
            profile={showProfile}
            currentUser={profile}
            onClose={() => setShowProfile(null)}
            onUpdateProfile={(p) => {
              onUpdateProfile(p);
              setShowProfile(p);
            }}
          />
        )}
      </AnimatePresence>
    </motion.div>
  );
}
