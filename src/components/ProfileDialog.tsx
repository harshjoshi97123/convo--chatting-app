import { 
  Dialog, 
  DialogContent, 
} from './ui/dialog';
import { 
  X, MapPin, Github, Twitter, Globe, Linkedin, MessageSquare
} from 'lucide-react';
import { Button } from './ui/button';
import { motion } from 'motion/react';

interface ProfileDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user: {
    id: string;
    name: string;
    email: string;
    bio?: string;
    avatar?: string | null;
    status?: string;
    statusEmoji?: string;
    statusText?: string;
    location?: string;
    github?: string;
    twitter?: string;
    website?: string;
    linkedin?: string;
    username?: string;
  } | null;
  onConnectClick?: (userId: string) => void;
  onMessageClick?: () => void;
  connectionStatus?: 'pending' | 'accepted' | 'rejected' | null;
}

export function ProfileDialog({ 
  open, onOpenChange, user, onConnectClick, onMessageClick, connectionStatus 
}: ProfileDialogProps) {
  if (!user) return null;

  const getInitials = (name: string) => {
    if (!name || name === 'Loading...') return 'U';
    return name.split(' ').filter(Boolean).map((n) => n[0]).join('').toUpperCase().slice(0, 2);
  };

  const statusColors: Record<string, string> = {
    online: 'bg-emerald-500',
    busy: 'bg-rose-500',
    away: 'bg-amber-500',
    offline: 'bg-slate-400',
  };

  const statusEmoji = user.statusEmoji || (user.status === 'busy' ? '🔴' : user.status === 'away' ? '🟡' : '🟢');

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[360px] p-0 overflow-hidden border-none bg-transparent shadow-none">
        <motion.div 
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          className="relative w-full rounded-[32px] overflow-hidden bg-gradient-to-br from-[#6366f1] to-[#a855f7] shadow-2xl"
        >
          {/* Close Button Overlay */}
          <button 
            onClick={() => onOpenChange(false)}
            className="absolute top-4 right-4 z-20 w-8 h-8 rounded-full bg-black/20 backdrop-blur-md flex items-center justify-center text-white hover:bg-black/40 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>

          {/* Background Decorations */}
          <div className="absolute top-[-10%] left-[-10%] w-48 h-48 bg-white/10 rounded-full blur-3xl animate-pulse" />
          <div className="absolute bottom-[-10%] right-[-10%] w-48 h-48 bg-white/20 rounded-full blur-3xl" />

          <div className="relative z-10 p-8 flex flex-col items-center text-center text-white">
            <div className="relative mb-6">
              <div className="w-32 h-32 rounded-[40px] overflow-hidden border-4 border-white/20 shadow-2xl relative bg-white/10 backdrop-blur-md">
                {user.avatar ? (
                  <img src={user.avatar} alt={user.name} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-3xl font-bold">
                    {getInitials(user.name)}
                  </div>
                )}
                {/* Status Indicator */}
                <div className={`absolute -bottom-1 -right-1 w-8 h-8 rounded-full border-4 border-white/20 shadow-lg ${statusColors[user.status || 'online'] || 'bg-emerald-500'} flex items-center justify-center text-xs`}>
                  {statusEmoji}
                </div>
              </div>
            </div>

            <h2 className="text-2xl font-black tracking-tight mb-1">{user.name}</h2>
            <p className="text-white/80 text-sm font-bold mb-4">
              {user.username ? `@${user.username}` : (user.statusText || user.status || 'Active Member')}
            </p>

            <div className="w-full space-y-4 px-2">
              <div className="bg-white/10 backdrop-blur-xl border border-white/10 rounded-2xl p-4 text-left shadow-inner">
                {user.bio ? (
                  <p className="text-sm leading-relaxed text-white/90 italic">"{user.bio}"</p>
                ) : (
                  <p className="text-sm text-white/40 italic">This user is keeping a low profile...</p>
                )}
                
                {(user.location || user.github || user.twitter || user.website || user.linkedin) && (
                  <div className="mt-4 pt-4 border-t border-white/10 flex flex-col gap-2">
                    {user.location && (
                      <div className="flex items-center gap-2 text-[10px] text-white/70 font-bold uppercase">
                        <MapPin className="w-3.5 h-3.5" /> {user.location}
                      </div>
                    )}
                    <div className="flex gap-4 pt-1">
                      {user.github && <Github className="w-4 h-4 opacity-70 hover:opacity-100 cursor-pointer transition-opacity" />}
                      {user.twitter && <Twitter className="w-4 h-4 opacity-70 hover:opacity-100 cursor-pointer transition-opacity" />}
                      {user.website && <Globe className="w-4 h-4 opacity-70 hover:opacity-100 cursor-pointer transition-opacity" />}
                      {user.linkedin && <Linkedin className="w-4 h-4 opacity-70 hover:opacity-100 cursor-pointer transition-opacity" />}
                    </div>
                  </div>
                )}
              </div>

              <div className="flex gap-3">
                <Button 
                  variant="outline"
                  disabled={!!connectionStatus}
                  onClick={() => user && onConnectClick?.(user.id)}
                  className={`flex-1 ${connectionStatus ? 'bg-white/5 opacity-50' : 'bg-white/10 hover:bg-white/20'} border-white/20 text-white font-bold rounded-xl h-11 transition-all`}
                >
                  {connectionStatus === 'pending' ? 'Request Sent' : 
                   connectionStatus === 'accepted' ? 'Connected' : 
                   'Connect'}
                </Button>
                <Button 
                  onClick={() => {
                    onOpenChange(false);
                    onMessageClick?.();
                  }}
                  className="flex-1 bg-white text-indigo-600 hover:bg-white/90 font-bold rounded-xl h-11"
                >
                  <MessageSquare className="w-4 h-4 mr-2" />
                  Message
                </Button>
              </div>
            </div>
          </div>
        </motion.div>
      </DialogContent>
    </Dialog>
  );
}
