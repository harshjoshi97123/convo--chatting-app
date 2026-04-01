import { useState, useRef, useCallback, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from './ui/dialog';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { 
  Camera, Upload, X, Loader2, ImageIcon, AlertCircle, 
  MapPin, Github, Twitter, Globe, Linkedin, Check,
  ChevronDown, Smile
} from 'lucide-react';
import { toast } from 'sonner';
import { projectId } from '../utils/supabase/info';
import { getSupabaseClient } from '../utils/supabase/client';
import { motion, AnimatePresence } from 'motion/react';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from './ui/dropdown-menu';

interface ProfileEditorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentUser: any;
  accessToken: string;
  onProfileUpdate: (updatedUser: any) => void;
}

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ACCEPTED_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
const AVATAR_SIZE = 300; // crop/compress to 300x300

const STATUS_OPTIONS = [
  { label: 'Online', value: 'online', color: 'bg-emerald-500', emoji: '🟢' },
  { label: 'Busy', value: 'busy', color: 'bg-rose-500', emoji: '🔴' },
  { label: 'Away', value: 'away', color: 'bg-amber-500', emoji: '🟡' },
  { label: 'Offline', value: 'offline', color: 'bg-slate-400', emoji: '⚪' },
];

export function ProfileEditor({
  open,
  onOpenChange,
  currentUser,
  accessToken,
  onProfileUpdate,
}: ProfileEditorProps) {
  const supabase = getSupabaseClient();
  const [name, setName] = useState(currentUser.name || '');
  const [bio, setBio] = useState(currentUser.bio || '');
  const [phone, setPhone] = useState(currentUser.phone || '');
  const [location, setLocation] = useState(currentUser.location || '');
  const [status, setStatus] = useState(currentUser.status || 'online');
  const [statusEmoji, setStatusEmoji] = useState(currentUser.statusEmoji || '');
  const [statusText, setStatusText] = useState(currentUser.statusText || '');
  const [username, setUsername] = useState(currentUser.username || '');
  
  // Social Links
  const [github, setGithub] = useState(currentUser.github || '');
  const [twitter, setTwitter] = useState(currentUser.twitter || '');
  const [website, setWebsite] = useState(currentUser.website || '');
  const [linkedin, setLinkedin] = useState(currentUser.linkedin || '');

  const [isLoading, setIsLoading] = useState(false);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(currentUser.avatar || null);
  const [fileError, setFileError] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Sync state when dialog opens
  useEffect(() => {
    if (open) {
      setName(currentUser.name || '');
      setBio(currentUser.bio || '');
      setPhone(currentUser.phone || '');
      setLocation(currentUser.location || '');
      setStatus(currentUser.status || 'online');
      setStatusEmoji(currentUser.statusEmoji || '');
      setStatusText(currentUser.statusText || '');
      setUsername(currentUser.username || '');
      setGithub(currentUser.github || '');
      setTwitter(currentUser.twitter || '');
      setWebsite(currentUser.website || '');
      setLinkedin(currentUser.linkedin || '');
      setAvatarPreview(currentUser.avatar || null);
    }
  }, [open, currentUser]);

  const getInitials = (name: string) => {
    if (!name || name === 'Loading...') return 'U';
    return name
      .split(' ')
      .filter(Boolean)
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const compressAndCropImage = useCallback(
    (file: File): Promise<string> => {
      return new Promise((resolve, reject) => {
        const img = new Image();
        const url = URL.createObjectURL(file);

        img.onload = () => {
          URL.revokeObjectURL(url);

          const canvas = document.createElement('canvas');
          canvas.width = AVATAR_SIZE;
          canvas.height = AVATAR_SIZE;
          const ctx = canvas.getContext('2d');

          if (!ctx) {
            reject(new Error('Canvas context unavailable'));
            return;
          }

          const size = Math.min(img.width, img.height);
          const x = (img.width - size) / 2;
          const y = (img.height - size) / 2;

          ctx.drawImage(img, x, y, size, size, 0, 0, AVATAR_SIZE, AVATAR_SIZE);
          const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
          resolve(dataUrl);
        };

        img.onerror = () => {
          URL.revokeObjectURL(url);
          reject(new Error('Failed to load image'));
        };

        img.src = url;
      });
    },
    []
  );

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileError('');
    if (!ACCEPTED_TYPES.includes(file.type)) {
      setFileError('Invalid file type. Please use JPG, PNG, or WebP.');
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    if (file.size > MAX_FILE_SIZE) {
      setFileError('File too large. Maximum size is 5MB.');
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    setIsUploadingAvatar(true);
    try {
      const compressed = await compressAndCropImage(file);
      setAvatarPreview(compressed);
      toast.success('Photo ready!');
    } catch (err) {
      console.error('Error processing image:', err);
      setFileError('Failed to process image.');
    } finally {
      setIsUploadingAvatar(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleSave = async () => {
    setIsLoading(true);
    try {
      // Double-Guard: Update Supabase Auth metadata directly from client first
      // This ensures it saves to Supabase even if the edge function has secret/key issues
      const { data: authData, error: authError } = await supabase.auth.updateUser({
        data: {
          name,
          username,
          bio,
          avatar: avatarPreview
        }
      });

      if (authError) {
        console.warn('[ProfileEditor] Auth metadata update error:', authError);
      } else {
        console.log('[ProfileEditor] Auth metadata updated successfully');
      }

      // Now call our backend for KV sync and deep profile data
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-5b740c2f/profile`,
        {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${accessToken}`,
          },
          body: JSON.stringify({
            name, bio, phone, avatar: avatarPreview,
            status, statusEmoji, statusText, username,
            location, github, twitter, website, linkedin
          }),
        }
      );

      if (response.ok) {
        const data = await response.json();
        toast.success('Identity updated!');
        onProfileUpdate(data.profile);
        onOpenChange(false);
      } else {
        const err = await response.json().catch(() => ({}));
        throw new Error(err.error || 'Failed to update profile');
      }
    } catch (error) {
      console.error('Error updating profile:', error);
      toast.error('Failed to update profile');
    } finally {
      setIsLoading(false);
    }
  };

  const currentStatus = STATUS_OPTIONS.find(s => s.value === status) || STATUS_OPTIONS[0];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[700px] p-0 overflow-hidden bg-background border-none shadow-2xl">
        <div className="flex flex-col md:flex-row h-[85vh] md:h-[600px]">
          {/* Left Side: Live Preview (Premium Card) */}
          <div className="md:w-[280px] bg-gradient-to-br from-[#6366f1] to-[#a855f7] p-6 text-white flex flex-col items-center justify-center relative overflow-hidden shrink-0">
            {/* Background Decorations */}
            <div className="absolute top-[-10%] left-[-10%] w-40 h-40 bg-white/10 rounded-full blur-3xl animate-pulse" />
            <div className="absolute bottom-[-10%] right-[-10%] w-40 h-40 bg-white/10 rounded-full blur-3xl" />
            
            <div className="relative z-10 w-full flex flex-col items-center text-center">
              <div className="relative mb-4 group cursor-pointer" onClick={() => fileInputRef.current?.click()}>
                <div className="w-32 h-32 rounded-3xl overflow-hidden border-4 border-white/20 shadow-2xl relative">
                  {avatarPreview ? (
                    <img src={avatarPreview} alt={name} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full bg-white/10 flex items-center justify-center text-3xl font-bold">
                      {getInitials(name)}
                    </div>
                  )}
                  {/* Status Ring */}
                  <div className={`absolute -bottom-1 -right-1 w-8 h-8 rounded-full border-4 border-[#7c3aed] ${currentStatus.color} flex items-center justify-center text-[10px] shadow-lg`}>
                    {statusEmoji || currentStatus.emoji}
                  </div>
                </div>
                <div className="absolute inset-0 rounded-3xl bg-black/40 opacity-0 group-hover:opacity-100 transition-all flex items-center justify-center">
                  <Camera className="w-8 h-8" />
                </div>
              </div>

              <h2 className="text-xl font-bold truncate w-full px-2">{name || 'Your Name'}</h2>
              <p className="text-white text-sm mt-1 flex items-center gap-1 justify-center font-black tracking-widest uppercase">
                {username ? (
                  <span className="flex items-center gap-1 bg-white/10 px-2 py-0.5 rounded-full border border-white/20">
                    <Check className="w-3 h-3 text-emerald-400" /> @{username}
                  </span>
                ) : (
                  <span className="opacity-70">{statusText || (status.charAt(0).toUpperCase() + status.slice(1))}</span>
                )}
              </p>

              <div className="mt-6 w-full space-y-4 text-left glass-effect p-4 rounded-2xl bg-white/10 backdrop-blur-md border border-white/10">
                {bio ? (
                  <p className="text-xs text-white/90 line-clamp-3 leading-relaxed italic">"{bio}"</p>
                ) : (
                  <p className="text-xs text-white/40 italic">No bio yet...</p>
                )}
                
                <div className="space-y-2 pt-2 border-t border-white/10">
                  {location && (
                    <div className="flex items-center gap-2 text-[10px] text-white/80">
                      <MapPin className="w-3 h-3" /> {location}
                    </div>
                  )}
                  <div className="flex gap-3 pt-1">
                    {github && <Github className="w-3.5 h-3.5 opacity-70" />}
                    {twitter && <Twitter className="w-3.5 h-3.5 opacity-70" />}
                    {website && <Globe className="w-3.5 h-3.5 opacity-70" />}
                    {linkedin && <Linkedin className="w-3.5 h-3.5 opacity-70" />}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Right Side: Edit Form */}
          <div className="flex-1 flex flex-col bg-background min-h-0">
            <div className="p-6 border-b flex items-center justify-between shrink-0">
              <div>
                <DialogTitle className="text-xl">Identity Hub</DialogTitle>
                <DialogDescription>Your professional profile on Convo</DialogDescription>
              </div>
              <Button variant="ghost" size="icon" onClick={() => onOpenChange(false)} className="rounded-full">
                <X className="w-5 h-5" />
              </Button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {/* Profile Status Section */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Status</Label>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="outline" className="w-full justify-between gap-2 border-dashed">
                        <div className="flex items-center gap-2">
                          <div className={`w-2 h-2 rounded-full ${currentStatus.color}`} />
                          {currentStatus.label}
                        </div>
                        <ChevronDown className="w-4 h-4 opacity-50" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="start" className="w-[180px]">
                      {STATUS_OPTIONS.map((opt) => (
                        <DropdownMenuItem key={opt.value} onClick={() => setStatus(opt.value)} className="gap-2">
                          <div className={`w-2 h-2 rounded-full ${opt.color}`} />
                          {opt.label}
                          {status === opt.value && <Check className="w-3 h-3 ml-auto" />}
                        </DropdownMenuItem>
                      ))}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
                <div className="space-y-2">
                  <Label>Custom Emoji</Label>
                  <div className="relative">
                    <Input 
                      placeholder="e.g. 🚀" 
                      value={statusEmoji} 
                      onChange={(e) => setStatusEmoji(e.target.value)}
                      maxLength={2}
                    />
                    <Smile className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 opacity-30" />
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Status Message</Label>
                <Input 
                  placeholder="What's happening?" 
                  value={statusText} 
                  onChange={(e) => setStatusText(e.target.value)}
                  maxLength={50}
                />
              </div>

              {/* Basic Info */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Display Name</Label>
                  <Input id="name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Full name" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="location">Location</Label>
                  <Input id="location" value={location} onChange={(e) => setLocation(e.target.value)} placeholder="City, Country" />
                </div>
              </div>

              <div className="space-y-2 border p-3 rounded-xl bg-muted/20 border-dashed">
                <div className="flex items-center justify-between mb-1">
                  <Label htmlFor="username">Unique Username</Label>
                  <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-widest">Crucial for Discovery</span>
                </div>
                <div className="relative">
                  <div className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground font-bold">@</div>
                  <Input 
                    id="username" 
                    value={username || ''} 
                    onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))} 
                    placeholder="unique_handle" 
                    className={`pl-8 ${(!username || username.length < 3) ? 'border-amber-500/50' : ''}`}
                  />
                  {(!username || username.length < 3) && (
                    <p className="text-[10px] text-amber-600 mt-1 flex items-center gap-1">
                      <AlertCircle className="w-3 h-3" /> Min 3 characters required
                    </p>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="bio">About Me</Label>
                <textarea 
                  id="bio"
                  className="w-full min-h-[80px] rounded-xl border bg-background px-3 py-2 text-sm focus:ring-2 focus:ring-[#6366f1] outline-none transition-all resize-none"
                  placeholder="Tell us about yourself..."
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  maxLength={140}
                />
                <div className="text-[10px] text-muted-foreground text-right">{bio.length}/140</div>
              </div>

              {/* Social Connections */}
              <div className="space-y-3 pt-2">
                <Label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Social Presence</Label>
                <div className="grid grid-cols-2 gap-3">
                  <div className="relative">
                    <Github className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 opacity-40" />
                    <Input className="pl-9 h-9 text-xs" placeholder="GitHub URL" value={github} onChange={(e) => setGithub(e.target.value)} />
                  </div>
                  <div className="relative">
                    <Twitter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 opacity-40" />
                    <Input className="pl-9 h-9 text-xs" placeholder="Twitter URL" value={twitter} onChange={(e) => setTwitter(e.target.value)} />
                  </div>
                  <div className="relative">
                    <Linkedin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 opacity-40" />
                    <Input className="pl-9 h-9 text-xs" placeholder="LinkedIn URL" value={linkedin} onChange={(e) => setLinkedin(e.target.value)} />
                  </div>
                  <div className="relative">
                    <Globe className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 opacity-40" />
                    <Input className="pl-9 h-9 text-xs" placeholder="Portfolio URL" value={website} onChange={(e) => setWebsite(e.target.value)} />
                  </div>
                </div>
              </div>
            </div>

            <div className="p-6 border-t bg-muted/30 shrink-0 flex items-center justify-between">
              <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-widest">Premium Identity</span>
              <div className="flex gap-2">
                <Button variant="ghost" size="sm" onClick={() => onOpenChange(false)}>Discard</Button>
                <Button 
                  onClick={handleSave} 
                  disabled={isLoading || !name.trim() || !username || username.length < 3}
                  className="bg-gradient-to-br from-[#6366f1] to-[#a855f7] hover:opacity-90 shadow-lg shadow-indigo-500/20"
                >
                  {isLoading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Check className="w-4 h-4 mr-2" />}
                  Save Identity
                </Button>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
      <input ref={fileInputRef} type="file" accept=".jpg,.jpeg,.png,.webp" onChange={handleFileChange} className="hidden" />
    </Dialog>
  );
}
