import { useState, useRef, ChangeEvent, FormEvent } from 'react';
import { motion } from 'framer-motion';
import { Camera, ArrowRight, User } from 'lucide-react';
import { UserProfile } from '../types';

export default function Registration({ onComplete }: { onComplete: (profile: UserProfile) => void }) {
  const [name, setName] = useState('');
  const [avatar, setAvatar] = useState<string | null>(null);
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

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (name.trim()) {
      onComplete({ 
        id: Math.random().toString(36).substring(2, 15),
        name: name.trim(), 
        avatar 
      });
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-6 bg-[#F2F2F7] text-[#1C1C1E] font-sans">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        className="w-full max-w-sm p-10 bg-white/80 border border-white rounded-[40px] shadow-2xl shadow-black/5 liquid-card"
      >
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold tracking-tight mb-2">Добро пожаловать</h1>
          <p className="text-black/40 text-[10px] uppercase tracking-widest font-bold">Создайте профиль для обмена</p>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col items-center gap-6">
          <div className="relative group cursor-pointer" onClick={() => fileInputRef.current?.click()}>
            <div className="w-24 h-24 rounded-full bg-black/5 overflow-hidden flex items-center justify-center border-2 border-black/5 group-hover:border-[#007AFF] transition-colors">
              {avatar ? (
                <img src={avatar} alt="Avatar" className="w-full h-full object-cover" />
              ) : (
                <User className="w-10 h-10 text-black/20" />
              )}
            </div>
            <div className="absolute inset-0 bg-black/40 rounded-full opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
              <Camera className="w-6 h-6 text-white" />
            </div>
            <input 
              type="file" 
              ref={fileInputRef}
              onChange={handleAvatarChange}
              accept="image/*" 
              className="hidden" 
            />
          </div>

          <div className="w-full">
            <input
              type="text"
              placeholder="Ваше имя"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-4 py-4 bg-black/5 border border-transparent rounded-2xl outline-none focus:border-[#007AFF] focus:bg-white transition-all text-[#1C1C1E] placeholder-black/30 text-center text-lg font-medium shadow-sm"
              required
              autoFocus
            />
          </div>

          <button
            type="submit"
            disabled={!name.trim()}
            className="w-full py-4 mt-4 bg-[#007AFF] text-white rounded-2xl font-bold text-lg flex items-center justify-center gap-2 shadow-lg shadow-[#007AFF]/30 disabled:opacity-50 disabled:shadow-none hover:bg-[#007AFF]/90 transition-all active:scale-95 liquid-card"
          >
            Продолжить <ArrowRight className="w-5 h-5" />
          </button>
        </form>
      </motion.div>
    </div>
  );
}
