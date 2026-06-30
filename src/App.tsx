import { useState, useEffect } from 'react';
import Registration from './components/Registration';
import Home from './components/Home';
import Room from './components/Room';
import { UserProfile } from './types';
import { globalSocket } from './lib/socket';
import { motion, AnimatePresence } from 'framer-motion';
import { useTVNavigation } from './lib/useTVNavigation';

export default function App() {
  useTVNavigation();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [activeRoomId, setActiveRoomId] = useState<string | null>(null);
  const [isInitializing, setIsInitializing] = useState(true);
  const [incomingRequest, setIncomingRequest] = useState<{roomId: string, from: UserProfile, targetUserId: string} | null>(null);

  useEffect(() => {
    const stored = localStorage.getItem('userProfile');
    if (stored) {
      const p = JSON.parse(stored);
      if (!p.id) {
        p.id = Math.random().toString(36).substring(2, 15);
        localStorage.setItem('userProfile', JSON.stringify(p));
      }
      setProfile(p);
    }

    const params = new URLSearchParams(window.location.search);
    const roomParam = params.get('room');
    if (roomParam) {
      setActiveRoomId(roomParam);
      // Clean up URL without reload
      window.history.replaceState({}, document.title, "/");
    }
    
    setIsInitializing(false);
  }, []);

  useEffect(() => {
    if (profile) {
      globalSocket.connect();
      globalSocket.emit('register', profile.id, profile);
      
      const onRequested = (roomId: string, fromProfile: UserProfile) => {
        setIncomingRequest({roomId, from: fromProfile, targetUserId: fromProfile.id});
      };
      
      globalSocket.on('session-requested', onRequested);
      
      return () => {
        globalSocket.off('session-requested', onRequested);
      };
    }
  }, [profile]);

  const handleRegistrationComplete = (p: UserProfile) => {
    localStorage.setItem('userProfile', JSON.stringify(p));
    setProfile(p);
  };

  const handleHostSession = (roomId: string) => {
    setActiveRoomId(roomId);
  };

  const handleLeaveRoom = () => {
    setActiveRoomId(null);
  };

  const acceptSession = () => {
    if (incomingRequest) {
      globalSocket.emit('accept-session', incomingRequest.targetUserId, incomingRequest.roomId);
      setActiveRoomId(incomingRequest.roomId);
      setIncomingRequest(null);
    }
  };

  const rejectSession = () => {
    if (incomingRequest) {
      globalSocket.emit('reject-session', incomingRequest.targetUserId);
      setIncomingRequest(null);
    }
  };

  if (isInitializing) return null;

  const handleUpdateProfile = (newProfile: UserProfile) => {
    localStorage.setItem('userProfile', JSON.stringify(newProfile));
    setProfile(newProfile);
    globalSocket.emit('register', newProfile.id, newProfile);
  };

  if (!profile) {
    return <Registration onComplete={handleRegistrationComplete} />;
  }

  return (
    <>
      {activeRoomId ? (
        <Room roomId={activeRoomId} profile={profile} onLeave={handleLeaveRoom} onUpdateProfile={handleUpdateProfile} />
      ) : (
        <Home profile={profile} onHostSession={handleHostSession} onUpdateProfile={handleUpdateProfile} />
      )}
      
      <AnimatePresence>
        {incomingRequest && (
          <motion.div 
            key="incoming-request-modal"
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 50 }}
            className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 w-full max-w-sm px-4"
          >
            <div className="bg-white rounded-3xl p-5 shadow-2xl border border-black/5 flex flex-col gap-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full overflow-hidden bg-gradient-to-br from-[#007AFF] to-[#5856D6] flex items-center justify-center text-white font-bold text-lg shrink-0">
                  {incomingRequest.from.avatar ? (
                    <img src={incomingRequest.from.avatar} alt="Avatar" className="w-full h-full object-cover" />
                  ) : (
                    incomingRequest.from.name.charAt(0).toUpperCase()
                  )}
                </div>
                <div>
                  <p className="font-bold text-[#1C1C1E]">{incomingRequest.from.name}</p>
                  <p className="text-xs text-black/50">Хочет передать файлы</p>
                </div>
              </div>
              <div className="flex gap-2">
                <button onClick={rejectSession} className="flex-1 py-3 bg-black/5 text-[#1C1C1E] rounded-xl font-bold text-sm hover:bg-black/10 transition-colors">
                  Отклонить
                </button>
                <button onClick={acceptSession} className="flex-1 py-3 bg-[#007AFF] text-white rounded-xl font-bold text-sm shadow-md shadow-[#007AFF]/20 hover:bg-[#007AFF]/90 transition-colors">
                  Принять
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

