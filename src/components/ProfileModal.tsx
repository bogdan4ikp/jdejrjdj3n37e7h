import { useState, useRef, ChangeEvent } from 'react';
import { motion } from 'framer-motion';
import { X, Camera, Edit2 } from 'lucide-react';
import { UserProfile } from '../types';

export default function ProfileModal({
  profile,
  currentUser,
  onClose,
  onUpdateProfile
}: {
  profile: UserProfile;
  currentUser: UserProfile;
  onClose: () => void;
  onUpdateProfile: (newProfile: UserProfile) => void;
}) {
  const isMe = profile.id === currentUser.id;
  const [isEditing, setIsEditing] = useState(false);
  const [name, setName] = useState(profile.name);
  const [avatar, setAvatar] = useState<string | null>(profile.avatar);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleAvatarChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setAvatar(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSave = () => {
    if (name.trim()) {
      onUpdateProfile({ ...profile, name: name.trim(), avatar });
      setIsEditing(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('userProfile');
    window.location.reload();
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 bg-black/40 backdrop-blur-md flex flex-col items-center justify-center p-6"
    >
      <motion.div
        initial={{ scale: 0.9, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.9, y: 20 }}
        className="w-full max-w-sm bg-white/80 rounded-[40px] shadow-2xl p-8 relative liquid-card flex flex-col items-center border border-white"
      >
        <button 
          onClick={onClose}
          className="absolute top-6 right-6 w-8 h-8 flex items-center justify-center bg-black/5 rounded-full hover:bg-black/10 transition-colors z-10"
        >
          <X className="w-5 h-5" />
        </button>
        
        {isEditing ? (
          <>
            <div className="relative mb-6 mt-4">
              <div className="w-32 h-32 rounded-full overflow-hidden bg-gradient-to-br from-[#007AFF] to-[#5856D6] flex items-center justify-center text-white font-bold text-4xl shadow-xl shadow-black/10">
                {avatar ? (
                  <img src={avatar} alt="Avatar" className="w-full h-full object-cover" />
                ) : (
                  profile.name.charAt(0).toUpperCase()
                )}
              </div>
              <button 
                onClick={() => fileInputRef.current?.click()}
                className="absolute bottom-0 right-0 w-10 h-10 bg-white rounded-full shadow-lg flex items-center justify-center text-[#007AFF] hover:bg-gray-50 transition-colors border border-black/5"
              >
                <Camera className="w-5 h-5" />
              </button>
              <input 
                type="file" 
                ref={fileInputRef}
                className="hidden" 
                accept="image/*"
                onChange={handleAvatarChange}
              />
            </div>
            
            <input 
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              className="w-full text-center text-2xl font-bold tracking-tight bg-transparent border-b-2 border-black/10 focus:border-[#007AFF] outline-none pb-2 mb-8 transition-colors"
              placeholder="Ваше имя"
            />
            
            <div className="flex gap-3 w-full">
               <button 
                onClick={() => {
                  setIsEditing(false);
                  setName(profile.name);
                  setAvatar(profile.avatar);
                }}
                className="flex-1 py-4 bg-black/5 text-black rounded-2xl font-bold text-sm hover:bg-black/10 transition-colors"
              >
                Отмена
              </button>
              <button 
                onClick={handleSave}
                disabled={!name.trim()}
                className="flex-1 py-4 bg-[#007AFF] text-white rounded-2xl font-bold text-sm hover:bg-[#007AFF]/90 transition-colors disabled:opacity-50 shadow-lg shadow-[#007AFF]/20"
              >
                Сохранить
              </button>
            </div>
          </>
        ) : (
          <>
            <div className="w-32 h-32 rounded-full overflow-hidden bg-gradient-to-br from-[#007AFF] to-[#5856D6] flex items-center justify-center text-white font-bold text-4xl shadow-xl shadow-black/10 mb-6 mt-4 relative group">
              {profile.avatar ? <img src={profile.avatar} alt="Avatar" className="w-full h-full object-cover" /> : profile.name.charAt(0).toUpperCase()}
              {isMe && (
                <div onClick={() => setIsEditing(true)} className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer">
                  <Camera className="w-8 h-8 text-white" />
                </div>
              )}
            </div>
            
            <h2 className="text-2xl font-bold tracking-tight mb-1 flex items-center justify-center gap-2">
              {profile.name}
              {isMe && (
                <button onClick={() => setIsEditing(true)} className="text-[#007AFF] hover:bg-[#007AFF]/10 p-2 rounded-full transition-colors">
                  <Edit2 className="w-4 h-4" />
                </button>
              )}
            </h2>
            <p className="text-[10px] text-black/40 uppercase tracking-widest font-bold mb-8">ID: {profile.id}</p>
            
            {isMe && (
              <button 
                onClick={handleLogout}
                className="w-full py-4 bg-red-500/10 text-red-500 rounded-2xl font-bold text-sm hover:bg-red-500/20 transition-colors"
              >
                Выйти из аккаунта
              </button>
            )}
          </>
        )}
      </motion.div>
    </motion.div>
  );
}
