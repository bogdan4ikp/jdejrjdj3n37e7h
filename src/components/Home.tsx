import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { QRCodeSVG } from 'qrcode.react';
import { QrCode, Wifi, ShieldCheck, X, Camera, Users, Loader2 } from 'lucide-react';
import { UserProfile } from '../types';
import { Scanner } from '@yudiel/react-qr-scanner';
import { globalSocket } from '../lib/socket';
import ProfileModal from './ProfileModal';

import { getAppOrigin } from '../lib/config';

const containerVariants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.1 } }
};

const itemVariants = {
  hidden: { opacity: 0, y: 15 },
  show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 400, damping: 30 } }
};

export default function Home({ 
  profile, 
  onHostSession,
  onUpdateProfile
}: { 
  profile: UserProfile;
  onHostSession: (roomId: string) => void;
  onUpdateProfile: (newProfile: UserProfile) => void;
}) {
  const [showQR, setShowQR] = useState(false);
  const [showScanner, setShowScanner] = useState(false);
  const [showProfile, setShowProfile] = useState<UserProfile | null>(null);
  const [roomId, setRoomId] = useState('');
  const [qrUrl, setQrUrl] = useState('');
  
  const [friends, setFriends] = useState<UserProfile[]>([]);
  const [onlineUsers, setOnlineUsers] = useState<Record<string, UserProfile>>({});
  const [requestingSession, setRequestingSession] = useState<string | null>(null);

  useEffect(() => {
    const newRoomId = Math.random().toString(36).substring(2, 9);
    setRoomId(newRoomId);
    setQrUrl(`${getAppOrigin()}/?room=${newRoomId}`);
    
    // Load friends
    const storedFriends = localStorage.getItem('friends');
    if (storedFriends) {
      setFriends(JSON.parse(storedFriends));
    }
  }, []);

  useEffect(() => {
    const onOnlineUsers = (users: {id: string, profile: UserProfile}[]) => {
      const map: Record<string, UserProfile> = {};
      users.forEach(u => map[u.id] = u.profile);
      setOnlineUsers(map);
    };

    const onUserOnline = (userId: string, p: UserProfile) => {
      setOnlineUsers(prev => ({...prev, [userId]: p}));
    };

    const onUserOffline = (userId: string) => {
      setOnlineUsers(prev => {
        const next = {...prev};
        delete next[userId];
        return next;
      });
    };
    
    const onSessionAccepted = (acceptedRoomId: string) => {
      setRequestingSession(null);
      onHostSession(acceptedRoomId);
    };

    const onSessionRejected = () => {
      setRequestingSession(null);
      alert('Запрос отклонен');
    };

    globalSocket.on('online-users', onOnlineUsers);
    globalSocket.on('user-online', onUserOnline);
    globalSocket.on('user-offline', onUserOffline);
    globalSocket.on('session-accepted', onSessionAccepted);
    globalSocket.on('session-rejected', onSessionRejected);

    return () => {
      globalSocket.off('online-users', onOnlineUsers);
      globalSocket.off('user-online', onUserOnline);
      globalSocket.off('user-offline', onUserOffline);
      globalSocket.off('session-accepted', onSessionAccepted);
      globalSocket.off('session-rejected', onSessionRejected);
    };
  }, [onHostSession]);

  const handleScan = (text: string) => {
    if (text) {
      try {
        const url = new URL(text);
        const room = url.searchParams.get('room');
        if (room) {
          setShowScanner(false);
          onHostSession(room);
        }
      } catch (e) {
        console.error("Invalid QR code");
      }
    }
  };

  const handleRequestSession = (friendId: string) => {
    if (onlineUsers[friendId]) {
      setRequestingSession(friendId);
      globalSocket.emit('request-session', friendId, roomId, profile);
    }
  };

  return (
    <motion.div 
      variants={containerVariants} 
      initial="hidden" 
      animate="show" 
      className="flex flex-col items-center min-h-screen p-6 bg-[#F2F2F7] text-[#1C1C1E] font-sans pb-24"
    >
      {/* Header */}
      <motion.div variants={itemVariants} className="w-full max-w-md flex justify-between items-center mt-8 mb-12">
        <button 
          onClick={() => setShowProfile(profile)}
          className="flex items-center gap-3 bg-white/80 p-2 pr-5 rounded-full shadow-sm border border-black/5 liquid-card hover:scale-105 transition-transform text-left"
        >
          <div className="w-10 h-10 rounded-full overflow-hidden bg-gradient-to-br from-[#007AFF] to-[#5856D6] flex items-center justify-center text-white font-bold text-lg">
            {profile.avatar ? <img src={profile.avatar} alt="Avatar" className="w-full h-full object-cover" /> : profile.name.charAt(0).toUpperCase()}
          </div>
          <div>
            <p className="text-[10px] text-black/40 font-bold uppercase tracking-widest leading-tight">Активный узел</p>
            <p className="font-bold text-sm leading-tight">{profile.name}</p>
          </div>
        </button>
        <div className="flex items-center gap-1.5 px-3 py-1.5 bg-black text-white rounded-full shadow-md">
          <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
          <span className="text-[10px] font-bold uppercase tracking-widest">Безопасно</span>
        </div>
      </motion.div>

      <motion.div variants={itemVariants} className="w-full max-w-md flex flex-col gap-6">
        <button 
          onClick={() => setShowQR(true)}
          className="w-full bg-white/80 rounded-[40px] shadow-2xl shadow-black/5 p-10 flex flex-col items-center justify-center border border-white hover:border-[#007AFF]/20 transition-all active:scale-[0.98] liquid-card group"
        >
          <div className="text-center mb-6">
            <h2 className="text-2xl font-bold tracking-tight">Поделиться</h2>
            <p className="text-black/40 text-[10px] uppercase tracking-widest font-bold mt-1">Покажите QR-код</p>
          </div>
          <div className="w-16 h-16 rounded-2xl bg-[#007AFF]/10 flex items-center justify-center group-hover:scale-110 transition-transform">
            <QrCode className="w-8 h-8 text-[#007AFF]" />
          </div>
        </button>

        <div className="flex gap-4">
          <button 
            onClick={() => setShowScanner(true)}
            className="flex-1 p-6 bg-white/60 backdrop-blur-xl border border-white rounded-[32px] shadow-sm flex flex-col items-center justify-center gap-3 hover:bg-white transition-all active:scale-[0.98] liquid-card group"
          >
            <div className="w-12 h-12 rounded-full bg-[#5856D6]/10 flex items-center justify-center group-hover:scale-110 transition-transform">
              <Camera className="w-5 h-5 text-[#5856D6]" />
            </div>
            <span className="font-bold text-sm">Сканировать QR</span>
          </button>
        </div>
        
        {/* Friends / Contacts list */}
        <motion.div variants={itemVariants} className="w-full bg-white/60 backdrop-blur-xl border border-white rounded-[40px] shadow-sm p-8 mt-2 liquid-card">
           <div className="flex items-center gap-3 mb-6">
              <Users className="w-5 h-5 text-black/40" />
              <h3 className="font-bold text-sm uppercase tracking-widest text-black/40">Контакты</h3>
           </div>
           
           <div className="flex flex-col gap-4">
              {friends.length === 0 ? (
                <p className="text-sm text-black/40 text-center py-4">Нет сохраненных контактов. Подключитесь к кому-нибудь, чтобы добавить.</p>
              ) : (
                Array.from(new Map(friends.map(f => [f.id, f])).values()).map(friend => {
                  const isOnline = !!onlineUsers[friend.id];
                  const isRequesting = requestingSession === friend.id;
                  
                  return (
                    <div key={friend.id} className="flex items-center justify-between p-4 bg-white/80 rounded-3xl shadow-sm border border-black/5 liquid-card">
                      <button onClick={() => setShowProfile(friend)} className="flex items-center gap-4 text-left group">
                        <div className="relative">
                          <div className="w-12 h-12 rounded-full overflow-hidden bg-black/5 flex items-center justify-center text-xl font-bold text-black/30 group-hover:scale-105 transition-transform">
                            {friend.avatar ? <img src={friend.avatar} alt="Avatar" className="w-full h-full object-cover" /> : friend.name.charAt(0).toUpperCase()}
                          </div>
                          {isOnline && (
                            <div className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-green-400 border-2 border-white rounded-full"></div>
                          )}
                        </div>
                        <div>
                          <p className="font-bold text-[#1C1C1E] group-hover:text-[#007AFF] transition-colors">{friend.name}</p>
                          <p className="text-[10px] text-black/40 uppercase tracking-widest font-bold mt-1">
                            {isOnline ? 'В сети' : 'Не в сети'}
                          </p>
                        </div>
                      </button>
                      
                      {isOnline && (
                        <button 
                          onClick={() => handleRequestSession(friend.id)}
                          disabled={isRequesting}
                          className="px-4 py-2 bg-[#007AFF]/10 text-[#007AFF] rounded-full font-bold text-[10px] uppercase tracking-widest hover:bg-[#007AFF]/20 transition-colors disabled:opacity-50"
                        >
                          {isRequesting ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            'Отправить'
                          )}
                        </button>
                      )}
                    </div>
                  );
                })
              )}
           </div>
        </motion.div>
      </motion.div>

      <AnimatePresence>
        {showQR && (
          <motion.div 
            key="qr-modal"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-black/40 backdrop-blur-md"
          >
            <motion.div 
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              className="w-full max-w-sm bg-white border border-white rounded-[40px] shadow-2xl p-8 flex flex-col items-center relative"
            >
              <button 
                onClick={() => setShowQR(false)}
                className="absolute top-6 right-6 w-8 h-8 flex items-center justify-center bg-black/5 rounded-full text-black/40 hover:text-black/70 hover:bg-black/10 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
              
              <h3 className="text-2xl font-bold tracking-tight mb-1 mt-2">Сканируйте</h3>
              <p className="text-black/40 text-[10px] text-center mb-8 uppercase tracking-widest font-bold">Наведите камеру на код</p>
              
              <div className="p-4 bg-white shadow-sm border border-black/5 rounded-3xl mb-8">
                <QRCodeSVG value={qrUrl} size={200} level="H" />
              </div>

              <button 
                onClick={() => onHostSession(roomId)}
                className="w-full py-4 bg-[#007AFF] text-white rounded-2xl font-bold text-lg shadow-lg shadow-[#007AFF]/30 flex items-center justify-center hover:bg-[#007AFF]/90 transition-all active:scale-[0.98]"
              >
                Начать сеанс
              </button>
            </motion.div>
          </motion.div>
        )}

        {showScanner && (
          <motion.div 
            key="scanner-modal"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black flex flex-col items-center"
          >
             <div className="w-full p-6 flex justify-end">
                <button 
                  onClick={() => setShowScanner(false)}
                  className="w-10 h-10 flex items-center justify-center bg-white/10 rounded-full text-white hover:bg-white/20 transition-colors"
                >
                  <X className="w-6 h-6" />
                </button>
             </div>
             <div className="flex-1 w-full max-w-md relative overflow-hidden rounded-t-[40px]">
                <Scanner onScan={(result) => handleScan(result[0]?.rawValue)} />
                <div className="absolute inset-0 pointer-events-none border-[40px] border-black/50 z-10"></div>
                <div className="absolute bottom-20 left-0 right-0 text-center z-20">
                   <p className="text-white font-bold tracking-widest uppercase text-sm">Наведите на QR-код</p>
                </div>
             </div>
          </motion.div>
        )}

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
