import { useState, useEffect } from 'react';
import { EmojiText } from './EmojiText';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { ScrollArea } from './ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import {
  MessageSquare,
  Search,
  LogOut,
  Users,
  Clock,
  MessageCircle,
  Plus,
  Settings,
  User,
  Hash,
  PhoneIncoming,
  PhoneOutgoing,
  Send,
  AlertCircle,
} from 'lucide-react';
import { projectId, publicAnonKey } from '../utils/supabase/info';
import { getSupabaseClient } from '../utils/supabase/client';
import { motion } from 'motion/react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from './ui/dropdown-menu';
import { ScheduledPanel } from './ScheduledPanel';
import { ProfileEditor } from './ProfileEditor';
import { SettingsDialog } from './SettingsDialog';
import { JoinRoomDialog } from './JoinRoomDialog';

interface Conversation {
  id: string;
  participantId: string;
  groupId?: string | null;
  groupName?: string | null;
  lastMessage: string;
  lastMessageTime: string;
  unreadCount: number;
  isRoom?: boolean;
  memberCount?: number;
  participantName?: string;
}

interface User {
  id: string;
  name: string;
  email: string;
  username?: string;
  bio?: string;
  avatar_url?: string | null;
  status?: 'online' | 'busy' | 'away' | 'offline';
  statusEmoji?: string;
  statusText?: string;
  location?: string;
  github?: string;
  twitter?: string;
  website?: string;
  linkedin?: string;
}

interface CallLog {
  id: string;
  type: 'incoming' | 'outgoing';
  isVideo: boolean;
  participantName: string;
  participantId: string;
  timestamp: string;
  duration: number;
  status: 'missed' | 'completed' | 'rejected';
}

interface SidebarModernProps {
  currentUser: User;
  conversations: Conversation[];
  onSelectConversation: (conversation: Conversation) => void;
  onNewChat: (userId: string) => void;
  onCreateGroup: () => void;
  onLogout: () => void;
  selectedConversationId: string | null;
  accessToken: string;
  onWallpaperChange?: (wallpaper: string) => void;
  darkMode?: boolean;
  onToggleDarkMode?: () => void;
  theme?: string;
  onThemeChange?: (theme: string) => void;
  onProfileUpdate?: (updatedUser: any) => void;
  globalRooms: any[];
  joinedRoomIds: string[];
  onCreateRoomOpen: () => void;
  onCreateRoom: (room: any) => void;
  onJoinRoom: (roomId: string) => Promise<boolean> | boolean;
  onViewProfile?: (userId: string) => void;
  connectionRequests?: any[];
  onUpdateConnection?: (requestId: string, status: 'accepted' | 'rejected') => void;
  onSelectScheduled?: (item: any) => void;
}




export function SidebarModern({
  currentUser,
  conversations,
  onSelectConversation,
  onNewChat,
  onCreateGroup,
  onLogout,
  selectedConversationId,
  accessToken,
  onWallpaperChange,
  darkMode = false,
  onToggleDarkMode,
  theme,
  onThemeChange,
  onProfileUpdate,
  globalRooms,
  joinedRoomIds,
  onCreateRoomOpen,
  onCreateRoom,
  onJoinRoom,
  onViewProfile,
  connectionRequests = [],
  onUpdateConnection,
  onSelectScheduled,
}: SidebarModernProps) {
  const [activeTab, setActiveTab] = useState('chats');
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [profileEditorOpen, setProfileEditorOpen] = useState(false);

  const [searchQuery, setSearchQuery] = useState('');
  const [users, setUsers] = useState<User[]>([]);
  const [userDetails, setUserDetails] = useState<Record<string, User>>({});
  const [localUser, setLocalUser] = useState(currentUser);
  const [joinRoomOpen, setJoinRoomOpen] = useState(false);
  const [callLogs, setCallLogs] = useState<CallLog[]>([]);

  useEffect(() => {
    const savedLogs = localStorage.getItem('call_logs');
    if (savedLogs) {
      setCallLogs(JSON.parse(savedLogs));
    }

    const handleCallLogUpdate = () => {
      const logs = localStorage.getItem('call_logs');
      if (logs) setCallLogs(JSON.parse(logs));
    };

    window.addEventListener('storage', handleCallLogUpdate);
    return () => window.removeEventListener('storage', handleCallLogUpdate);
  }, []);


  // Keep localUser in sync when currentUser changes (e.g. after app-level profile fetch)
  useEffect(() => {
    setLocalUser(currentUser);
  }, [currentUser]);

  useEffect(() => {
    // Initial fetch and polling
    fetchUsers(searchQuery);
    const interval = setInterval(() => fetchUsers(searchQuery), 30000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      fetchUsers(searchQuery);
    }, 400);

    return () => clearTimeout(delayDebounceFn);
  }, [searchQuery]);

  useEffect(() => {
    if (conversations.length > 0) {
      fetchUserDetails();
    }
  }, [conversations]);

  const fetchUsers = async (query = '') => {
    try {
      const supabase = getSupabaseClient();
      console.log('[Sidebar] Fetching users (Postgres)... query:', query);
      
      let q = supabase
        .from('users')
        .select('id, name, username, email, avatar_url');
        
      if (query.trim()) {
        q = q.or(`name.ilike.%${query.trim()}%,username.ilike.%${query.trim()}%`);
      }
      
      const { data, error } = await q.order('name');
      
      if (error) {
         console.error('[Sidebar] Error fetching users table:', error);
         return;
      }
      
      console.log('[Sidebar] Users table returned:', data?.length, 'rows. Data:', data);
      
      // strictly bind the UI to the Postgres query, even if empty (since backfill will supply it)
      if (data) {
        setUsers(data as User[]);
        const details: Record<string, User> = { ...userDetails };
        (data as any[]).forEach((u) => {
          details[u.id] = u as User;
        });
        setUserDetails(details);
      }
    } catch (error) {
      console.error('Error fetching users/profiles:', error);
    }
  };

  const fetchUserDetails = async () => {
    const uniqueUserIds = [...new Set(conversations.map((c) => c.participantId).filter(Boolean))];
    const details: Record<string, User> = { ...userDetails };
    const missingIds = uniqueUserIds.filter(id => !details[id]);

    if (missingIds.length === 0) return;

    try {
      const supabase = getSupabaseClient();
      console.log('[Sidebar] Fetching missing user details from Postgres IDs:', missingIds);
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .in('id', missingIds);

      if (error) {
         console.error('[Sidebar] Error fetching missing user details:', error);
         return;
      }

      if (data) {
        const newDetails = { ...details };
        (data as any[]).forEach((u) => {
          newDetails[u.id] = u as User;
        });
        setUserDetails(newDetails);
      }
    } catch (error) {
      console.error('Error fetching user details from Postgres:', error);
    }
  };

  const getInitials = (name: string) => {
    if (!name || name === 'Loading...') return 'U';
    return name.split(' ').filter(Boolean).map((n) => n[0]).join('').toUpperCase().slice(0, 2);
  };

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMins = Math.floor((now.getTime() - date.getTime()) / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m`;
    if (diffHours < 24) return `${diffHours}h`;
    if (diffDays < 7) return `${diffDays}d`;
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const filteredConversations = conversations.filter((conv) => {
    const searchLower = searchQuery.toLowerCase();
    if (conv.groupId) {
      const name = conv.groupName || '';
      return name.toLowerCase().includes(searchLower) ||
        (conv.lastMessage || '').toLowerCase().includes(searchLower);
    }
    const lastMsg = (conv.lastMessage || '').toLowerCase();
    const user = userDetails[conv.participantId];
    if (!user) return lastMsg.includes(searchLower);
    return (
      (user.name || '').toLowerCase().includes(searchLower) ||
      lastMsg.includes(searchLower)
    );
  });

  const filteredUsers = users.filter((u: User) => u.id !== currentUser.id);

  // Ghost user logic removed in favor of backend search
  const pendingRequests = (connectionRequests || []).filter(r =>
    r.receiver_id === currentUser.id && r.status === 'pending'
  );


  const handleProfileUpdate = (updatedUser: any) => {
    setLocalUser(updatedUser);
    if (onProfileUpdate) onProfileUpdate(updatedUser);
    fetchUsers(); // Refresh the global list to show new handle
  };

  return (
    <div className="w-full md:w-96 border-r flex flex-col bg-background h-full min-h-0 relative overflow-hidden">
      {/* Header - Professional Standard */}
      <div className="p-4 border-b bg-background z-20 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-[#6366f1] to-[#a855f7] rounded-xl flex items-center justify-center shadow-lg flex-shrink-0">
              <Send className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-[#6366f1] tracking-tight leading-none mb-1">
                Convo
              </h1>
              <p className="text-[11px] text-muted-foreground font-medium">Stay connected</p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="icon" onClick={() => setActiveTab('contacts')} title="New Chat">
              <Plus className="w-5 h-5 text-muted-foreground" />
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="rounded-full w-10 h-10 p-0 relative group">
                  <Avatar className="w-8 h-8 border shadow-sm transition-transform group-hover:scale-105">
                    {localUser.avatar_url && (
                      <AvatarImage src={localUser.avatar_url} alt={localUser.name} className="object-cover" />
                    )}
                    <AvatarFallback className="bg-muted text-muted-foreground text-[10px] font-bold">
                      {getInitials(localUser.name)}
                    </AvatarFallback>
                  </Avatar>
                  {/* Status Indicator on Main Avatar */}
                  <div className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-background ${
                    localUser.status === 'busy' ? 'bg-rose-500' : 
                    localUser.status === 'away' ? 'bg-amber-500' : 
                    localUser.status === 'offline' ? 'bg-slate-400' : 'bg-emerald-500'
                  }`} />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-72 p-0 overflow-hidden border-none shadow-2xl rounded-2xl">
                {/* Premium Mini Card Header */}
                <div className="bg-gradient-to-br from-[#6366f1] to-[#a855f7] p-4 text-white">
                  <div className="flex items-center gap-3">
                    <div className="relative">
                      <Avatar className="w-12 h-12 border-2 border-white/20">
                        {localUser.avatar_url && (
                          <AvatarImage src={localUser.avatar_url} alt={localUser.name} className="object-cover" />
                        )}
                        <AvatarFallback className="bg-white/10 text-white text-xs font-bold">
                          {getInitials(localUser.name)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-white flex items-center justify-center text-[10px] shadow-sm">
                        {localUser.statusEmoji || (localUser.status === 'busy' ? '🔴' : localUser.status === 'away' ? '🟡' : '🟢')}
                      </div>
                    </div>
                    <div className="flex flex-col min-w-0">
                  <span className="text-sm font-bold text-white truncate leading-tight">{localUser?.name}</span>
                  <span className="text-[10px] text-indigo-200/60 font-medium truncate uppercase tracking-wider">
                    {localUser?.username ? `@${localUser.username}` : '@no_handle'}
                  </span>
                
                      <p className="text-[10px] bg-primary-foreground/10 px-1.5 py-0.5 rounded mt-1 inline-block">
                        {localUser.statusText || (localUser.status || 'Online')}
                      </p>
                    </div>
                  </div>
                </div>
                
                <div className="p-2 bg-background">
                  <DropdownMenuItem onClick={() => setProfileEditorOpen(true)} className="rounded-lg h-10 gap-3 group">
                    <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                      <User className="w-4 h-4" />
                    </div>
                    <div className="flex flex-col">
                      <span className="text-sm font-semibold">My Identity</span>
                      <span className="text-[10px] text-muted-foreground">Customize your presence</span>
                    </div>
                  </DropdownMenuItem>
                  
                  <DropdownMenuItem onClick={() => setSettingsOpen(true)} className="rounded-lg h-10 gap-3 group">
                    <div className="w-8 h-8 rounded-lg bg-secondary text-foreground/70 flex items-center justify-center group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                      <Settings className="w-4 h-4" />
                    </div>
                    <div className="flex flex-col">
                      <span className="text-sm font-semibold">App Settings</span>
                      <span className="text-[10px] text-muted-foreground">Themes & Preferences</span>
                    </div>
                  </DropdownMenuItem>
                  
                  <DropdownMenuSeparator className="my-2" />
                  
                  <DropdownMenuItem onClick={onLogout} className="rounded-lg h-10 gap-3 text-red-600 focus:text-red-700 focus:bg-red-50 dark:focus:bg-red-950/30 group">
                    <div className="w-8 h-8 rounded-lg bg-red-50 dark:bg-red-950/20 text-red-600 flex items-center justify-center group-hover:bg-red-600 group-hover:text-white transition-colors">
                      <LogOut className="w-4 h-4" />
                    </div>
                    <div className="flex flex-col">
                      <span className="text-sm font-semibold">Sign Out</span>
                      <span className="text-[10px] text-red-400">Exit application</span>
                    </div>
                  </DropdownMenuItem>
                </div>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* Search */}
        <motion.div 
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: "easeOut" }}
          className="relative mt-2"
        >
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/60 transition-colors group-focus-within:text-primary" />
          <Input
            placeholder="Search conversations..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 rounded-xl bg-muted/50 border-transparent h-10 text-[15px] focus-visible:ring-2 focus-visible:ring-primary/20 transition-all duration-300 focus:bg-background focus:border-primary/20"
          />
        </motion.div>
      </div>

      {/* Tabs - Professional Standard */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col overflow-hidden min-h-0">
        <div className="px-4 py-3 flex-shrink-0 border-b bg-muted/5">
          <TabsList className="w-full p-0 bg-transparent rounded-none grid grid-cols-5 h-10 gap-1">
            <TabsTrigger
              value="chats"
              className="flex items-center gap-1.5 rounded-lg text-[13px] font-semibold transition-all data-[state=active]:bg-primary/10 data-[state=active]:text-primary data-[state=inactive]:hover:bg-muted/50 px-2"
            >
              <MessageSquare className="w-3.5 h-3.5" />
              Chats
            </TabsTrigger>
            <TabsTrigger
              value="rooms"
              className="flex items-center gap-1.5 rounded-lg text-[13px] font-semibold transition-all data-[state=active]:bg-primary/10 data-[state=active]:text-primary data-[state=inactive]:hover:bg-muted/50 px-2"
            >
              <Hash className="w-3.5 h-3.5" />
              Rooms
            </TabsTrigger>
            <TabsTrigger
              value="calls"
              className="flex items-center gap-1.5 rounded-lg text-[13px] font-semibold transition-all data-[state=active]:bg-primary/10 data-[state=active]:text-primary data-[state=inactive]:hover:bg-muted/50 px-2"
            >
              <PhoneIncoming className="w-3.5 h-3.5" />
              Calls
            </TabsTrigger>
            <TabsTrigger
              value="scheduled"
              className="flex items-center gap-1.5 rounded-lg text-[13px] font-semibold transition-all data-[state=active]:bg-[#6366f1]/10 dataIcon data-[state=active]:text-[#6366f1] data-[state=inactive]:hover:bg-muted/50 px-2"
            >
              <Clock className="w-3.5 h-3.5" />
              Later
            </TabsTrigger>
            <TabsTrigger
              value="contacts"
              className="flex items-center gap-1.5 rounded-lg text-[13px] font-semibold transition-all data-[state=active]:bg-primary/10 data-[state=active]:text-primary data-[state=inactive]:hover:bg-muted/50 px-2"
            >
              <Users className="w-3.5 h-3.5" />
              People
            </TabsTrigger>
          </TabsList>
        </div>

        {/* Chats Tab */}
        <TabsContent value="chats" className="flex-1 m-0 overflow-hidden relative min-h-0">
          <ScrollArea className="h-full">
            {filteredConversations.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground">
                <MessageCircle className="w-12 h-12 mx-auto mb-2 opacity-20" />
                <p className="text-sm">No conversations yet</p>
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-4 rounded-xl"
                  onClick={() => setActiveTab('contacts')}
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Start a new chat
                </Button>
              </div>
            ) : (
              <motion.div 
                initial="hidden"
                animate="visible"
                variants={{
                  visible: { transition: { staggerChildren: 0.05 } }
                }}
                className="px-2 pb-20"
              >
                {filteredConversations.map((conv) => {
                  const isGroup = !!conv.groupId;
                  const contactUser = !isGroup ? userDetails[conv.participantId] : null;

                  const isSelected = selectedConversationId === conv.id;
                  
                  const displayName = isGroup
                    ? conv.groupName || 'Group Chat'
                    : (contactUser?.name || conv.participantName || (contactUser?.email ? contactUser.email.split('@')[0] : `User_${conv.participantId?.slice(0, 4)}`));

                  return (
                    <motion.div 
                      key={conv.id} 
                      variants={{
                        hidden: { opacity: 0, x: -10 },
                        visible: { opacity: 1, x: 0 }
                      }}
                      className="px-1"
                    >
                      <div
                        onClick={() => onSelectConversation(conv)}
                        className={`flex items-center gap-3 p-3 cursor-pointer rounded-xl transition-all relative group mb-1 ${
                          isSelected
                            ? 'bg-primary/5 ring-1 ring-primary/20 shadow-[0_4px_12px_-4px_rgba(99,102,241,0.15)]'
                            : 'hover:bg-muted/50 hover:translate-x-1'
                        }`}
                      >
                        {isSelected && (
                          <motion.div 
                            layoutId="active-pill"
                            className="absolute left-0 w-1 h-6 bg-primary rounded-full" 
                            transition={{ type: "spring", stiffness: 300, damping: 30 }}
                          />
                        )}
                        <div className="relative flex-shrink-0">
                          <Avatar 
                            className="w-12 h-12 border shadow-sm group-hover:scale-105 transition-transform duration-300 cursor-pointer"
                            onClick={(e) => {
                              e.stopPropagation();
                              if (!isGroup) onViewProfile?.(conv.participantId);
                            }}
                          >
                            {!isGroup && contactUser?.avatar_url && (
                              <AvatarImage src={contactUser.avatar_url} alt={displayName} className="object-cover" />
                            )}
                            <AvatarFallback
                              className={`text-white font-bold text-xs transition-colors ${
                                isGroup ? 'bg-emerald-500' : 'bg-primary'
                              }`}
                            >
                              {isGroup ? <Users className="w-5 h-5" /> : getInitials(displayName || '')}
                            </AvatarFallback>
                          </Avatar>
                          {!isGroup && contactUser && (
                            <div className={`absolute bottom-0 right-0 w-3.5 h-3.5 rounded-full border-2 border-background shadow-sm transition-colors ${
                              contactUser.status === 'busy' ? 'bg-rose-500' : 
                              contactUser.status === 'away' ? 'bg-amber-500' : 
                              contactUser.status === 'offline' ? 'bg-slate-400' : 'bg-emerald-500'
                            }`} />
                          )}
                          {conv.unreadCount > 0 && (
                            <motion.div 
                              initial={{ scale: 0, boxShadow: "0 0 0 0 rgba(79, 70, 229, 0)" }}
                              animate={{ 
                                scale: 1,
                                boxShadow: ["0 0 0 0 rgba(79, 70, 229, 0.4)", "0 0 0 10px rgba(79, 70, 229, 0)"]
                              }}
                              transition={{ 
                                scale: { type: "spring", stiffness: 500, damping: 25 },
                                boxShadow: { duration: 2, repeat: Infinity, ease: "easeOut" }
                              }}
                              className="absolute -top-1 -right-1 z-10 min-w-[20px] h-5 bg-indigo-600 text-white rounded-full flex items-center justify-center border-2 border-background shadow-lg shadow-indigo-500/20 px-1"
                            >
                              <span className="text-[10px] font-black">{conv.unreadCount > 99 ? '99+' : conv.unreadCount}</span>
                            </motion.div>
                          )}
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between mb-0.5">
                            <h4 className={`font-semibold text-[14px] truncate transition-colors ${isSelected ? 'text-primary' : 'text-foreground'}`}>
                              {displayName}
                            </h4>
                            <span className="text-[10px] font-bold text-muted-foreground/60 uppercase">
                              {formatTime(conv.lastMessageTime)}
                            </span>
                          </div>
                          <p className={`text-[13px] line-clamp-1 truncate leading-tight transition-colors ${
                            conv.unreadCount > 0 ? 'text-foreground font-black' : 'text-muted-foreground font-medium'
                          }`}>
                            <EmojiText text={conv.lastMessage} size={13} />
                          </p>
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </motion.div>
            )}
          </ScrollArea>

          <div className="absolute bottom-6 right-6">
            <Button
              size="icon"
              className="rounded-full w-14 h-14 shadow-lg shadow-primary/20 bg-primary text-primary-foreground hover:opacity-90 transition-all border-none"
              onClick={onCreateGroup}
            >
              <Plus className="w-7 h-7" />
            </Button>
          </div>
        </TabsContent>

        {/* Rooms Tab */}
        <TabsContent value="rooms" className="flex-1 m-0 overflow-hidden relative min-h-0">
          <ScrollArea className="h-full">
            <div className="p-4 space-y-3">
              <div className="flex items-center justify-between px-2 mb-2">
                <h3 className="font-bold text-[11px] text-muted-foreground uppercase tracking-widest">Your Rooms</h3>
                <div className="flex gap-1.5">
                  <Button variant="outline" size="sm" className="h-8 rounded-lg text-[10px] font-bold uppercase tracking-wider border-primary/20 hover:bg-primary/5 text-primary" onClick={() => setJoinRoomOpen(true)}>
                    Join
                  </Button>
                  <Button variant="default" size="sm" className="h-8 rounded-lg text-[10px] font-bold uppercase tracking-wider bg-primary hover:bg-primary/90 shadow-sm" onClick={onCreateRoomOpen}>
                    New
                  </Button>
                </div>
              </div>

              {globalRooms.filter((r: any) => joinedRoomIds.includes(r.id)).length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <Hash className="w-10 h-10 mx-auto mb-2 opacity-20" />
                  <p className="text-sm font-medium">No rooms joined</p>
                </div>
              ) : (
                globalRooms.filter((r: any) => joinedRoomIds.includes(r.id)).map((room: any) => {
                  const isSelected = selectedConversationId === room.id;
                  return (
                    <button 
                      key={room.id} 
                      onClick={() => onSelectConversation(room)} 
                      className={`w-full p-4 rounded-xl border transition-all text-left flex items-center gap-4 ${
                        isSelected 
                          ? 'bg-primary/10 border-primary/20 shadow-sm' 
                          : 'bg-background hover:bg-muted/50 border-transparent'
                      }`}
                    >
                      <div className="w-10 h-10 rounded-lg bg-primary flex items-center justify-center text-primary-foreground shadow-sm flex-shrink-0">
                        <Hash className="w-5 h-5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className={`font-semibold text-sm truncate ${isSelected ? 'text-primary' : ''}`}>{room.groupName}</h4>
                        <p className="text-xs text-muted-foreground truncate"><EmojiText text={room.lastMessage} size={13} /></p>
                      </div>
                      <div className="flex flex-col items-end gap-2">
                        <div className="flex items-center gap-1 text-[10px] font-bold text-primary bg-primary/10 px-2 py-0.5 rounded-full">
                          <Users className="w-3 h-3"/> {room.memberCount}
                        </div>
                        {room.unreadCount > 0 && (
                          <motion.div 
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            className="w-5 h-5 bg-indigo-600 text-white rounded-full flex items-center justify-center text-[10px] font-black shadow-lg shadow-indigo-500/20 ring-2 ring-background"
                          >
                            {room.unreadCount > 99 ? '99+' : room.unreadCount}
                          </motion.div>
                        )}
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </ScrollArea>
        </TabsContent>

        {/* Calls Tab */}
        <TabsContent value="calls" className="flex-1 m-0 overflow-hidden relative min-h-0">
          <ScrollArea className="h-full">
            <div className="p-4 space-y-2">
              {callLogs.length === 0 ? (
                <div className="text-center py-20 opacity-20">
                  <PhoneIncoming className="w-16 h-16 mx-auto mb-4" />
                  <p className="text-sm">No call history</p>
                </div>
              ) : (
                [...callLogs].reverse().map((log) => (
                  <div key={log.id} className="p-3 rounded-xl border bg-muted/30 flex items-center gap-3">
                    <div className={`p-2 rounded-full ${log.type === 'incoming' ? 'bg-blue-500/10 text-blue-500' : 'bg-emerald-500/10 text-emerald-500'}`}>
                      {log.type === 'incoming' ? <PhoneIncoming className="w-4 h-4" /> : <PhoneOutgoing className="w-4 h-4" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <p className="font-semibold text-sm truncate">{log.participantName}</p>
                        <span className="text-[10px] text-muted-foreground uppercase">{formatTime(log.timestamp)}</span>
                      </div>
                      <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
                        <span className={log.status === 'missed' ? 'text-red-400' : ''}>
                          {log.status === 'completed' ? `Duration: ${Math.floor(log.duration / 60)}m ${log.duration % 60}s` : log.status}
                        </span>
                        <span>•</span>
                        <span>{log.isVideo ? 'Video' : 'Voice'} Call</span>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </ScrollArea>
        </TabsContent>

        {/* Scheduled Tab */}
        <TabsContent value="scheduled" className="flex-1 m-0 min-h-0">
          <ScheduledPanel 
            accessToken={accessToken} 
            currentUserId={currentUser.id} 
            onSelectItem={onSelectScheduled}
          />
        </TabsContent>

        {/* Contacts Tab */}
        <TabsContent value="contacts" className="flex-1 m-0 min-h-0">
          <ScrollArea className="h-full">
            <div className="p-4 space-y-4">
              {pendingRequests.length > 0 && (
                <div className="space-y-2">
                  <h3 className="text-[10px] font-bold uppercase tracking-widest text-primary px-2 mb-2">Pending Requests</h3>
                  {pendingRequests.map(req => {
                    const sender = users.find(u => u.id === req.sender_id);
                    if (!sender) return null;
                    return (
                      <div key={req.id} className="p-3 rounded-xl bg-primary/5 border border-primary/20 flex items-center gap-3">
                        <Avatar className="w-10 h-10">
                          <AvatarImage src={sender.avatar_url || ''} />
                          <AvatarFallback>{getInitials(sender.name)}</AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-bold truncate">{sender.name}</p>
                          <p className="text-xs text-muted-foreground truncate font-medium uppercase tracking-wider text-[9px]">
                            {sender.username ? `@${sender.username}` : `@${sender.email?.split('@')[0] || 'member'}`}
                          </p>
                        </div>
                        <div className="flex items-center gap-1">
                          <Button size="icon" variant="ghost" className="h-8 w-8 text-emerald-500 hover:text-emerald-600 hover:bg-emerald-500/10" onClick={() => onUpdateConnection?.(req.id, 'accepted')}>
                            <Plus className="w-4 h-4" />
                          </Button>
                          <Button size="icon" variant="ghost" className="h-8 w-8 text-rose-500 hover:text-rose-600 hover:bg-rose-500/10" onClick={() => onUpdateConnection?.(req.id, 'rejected')}>
                            <LogOut className="w-4 h-4 rotate-180" />
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              <h3 className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground px-2 mb-2">
                {searchQuery ? 'Search Results' : 'Suggested People'}
              </h3>

              {filteredUsers.length === 0 ? (
                <div className="p-8 text-center text-rose-500/80 bg-rose-500/5 rounded-xl border border-rose-500/20">
                  <AlertCircle className="w-12 h-12 mx-auto mb-3" />
                  <p className="text-sm font-bold">Database Empty</p>
                  <p className="text-xs text-muted-foreground mt-1">Please run the SQL Backfill script to restore users.</p>
                </div>
              ) : (
                <div className="space-y-2">
                {filteredUsers.map((user: User) => (
                  <button
                    key={user.id}
                    onClick={() => onNewChat(user.id)}
                    className="w-full p-3 rounded-xl hover:bg-muted/50 transition-all text-left flex items-center gap-3 group"
                  >
                    <div className="relative flex-shrink-0">
                      <Avatar 
                        className="w-12 h-12 border shadow-sm group-hover:scale-105 transition-transform cursor-pointer"
                        onClick={(e) => {
                          e.stopPropagation();
                          onViewProfile?.(user.id);
                        }}
                      >
                        {user.avatar_url && (
                          <AvatarImage src={user.avatar_url} alt={user.name} className="object-cover" />
                        )}
                        <AvatarFallback className="bg-primary text-primary-foreground font-bold">
                          {getInitials(user.name)}
                        </AvatarFallback>
                      </Avatar>
                      <div className={`absolute bottom-0 right-0 w-3.5 h-3.5 rounded-full border-2 border-background shadow-sm ${
                        user.status === 'busy' ? 'bg-rose-500' : 
                        user.status === 'away' ? 'bg-amber-500' : 
                        user.status === 'offline' ? 'bg-slate-400' : 'bg-emerald-500'
                      }`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm truncate group-hover:text-primary transition-colors">{user.name}</p>
                      <p className="text-xs text-muted-foreground truncate font-medium uppercase tracking-wider">
                        {user.username ? `@${user.username}` : `@${user.email?.split('@')[0] || 'member'}`}
                      </p>
                      {user.bio && (
                        <p className="text-xs text-muted-foreground truncate opacity-70">{user.bio}</p>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            )}
            </div>
          </ScrollArea>
        </TabsContent>
      </Tabs>

      {/* Profile Editor */}
      <ProfileEditor
        open={profileEditorOpen}
        onOpenChange={setProfileEditorOpen}
        currentUser={localUser}
        accessToken={accessToken}
        onProfileUpdate={handleProfileUpdate}
      />

      {/* Settings Dialog */}
      <SettingsDialog
        open={settingsOpen}
        onOpenChange={setSettingsOpen}
        accessToken={accessToken}
        currentUser={currentUser}
        onWallpaperChange={onWallpaperChange}
        darkMode={darkMode}
        onToggleDarkMode={onToggleDarkMode}
        theme={theme}
        onThemeChange={onThemeChange}
        onLogoutClick={onLogout}
        onProfileClick={() => setProfileEditorOpen(true)}
      />

      <JoinRoomDialog
        open={joinRoomOpen}
        onOpenChange={setJoinRoomOpen}
        onJoinRoom={onJoinRoom}
      />
    </div>
  );
}
