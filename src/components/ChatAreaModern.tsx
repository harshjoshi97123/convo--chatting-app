import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import React from 'react';
import { AppleEmoji } from './AppleEmoji';
import { EmojiText } from './EmojiText';
import { getEmojiHex, getAppleEmojiUrl } from '../utils/emojiUtils';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { ScrollArea } from './ui/scroll-area';
import {
  Phone,
  Video,
  MoreVertical,
  Send,
  Paperclip,
  Smile,
  Calendar,
  Image as ImageIcon,
  FileText,
  ArrowLeft,
  Trash2,
  UserX,
  Star,
  Bell,
  AlertCircle,
  Hash,
  Users,
  BookOpen,
  Clock,
  Bot,
  MessageSquare,
  History,
  Settings2,
  Plus,
  Link,
  Download,
  Sparkles,
  Loader2,
  ArrowUp
} from 'lucide-react';
import { Badge } from './ui/badge';
import { Textarea } from './ui/textarea';
import { uploadFile } from '../utils/supabase/storage';



import { StudyModeConfigDialog } from './StudyModeConfigDialog';
import { AICopilotPanel } from './AICopilotPanel';
import { projectId } from '../utils/supabase/info';
import { getSupabaseClient } from '../utils/supabase/client';
import { toast } from 'sonner';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from './ui/dropdown-menu';
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
  ContextMenuSeparator,
} from './ui/context-menu';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from './ui/popover';
import { EmojiPicker } from './EmojiPicker';
import { FilePreview } from './FilePreview';
import { SharedMediaPanel } from './SharedMediaPanel';
import { ConversationTimeline } from './ConversationTimeline';
import { TypingIndicator } from './TypingIndicator';
import { MessageStatusIcon } from './MessageStatusIcon';
import { motion, AnimatePresence } from 'motion/react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog';

interface Message {
  id: string;
  conversationId: string;
  senderId: string;
  content: string;
  timestamp: string;
  type: 'text' | 'image' | 'video' | 'document' | 'file' | 'audio';
  isDeletedForEveryone?: boolean;
  status?: 'sent' | 'delivered' | 'read';
  seen?: boolean;
  reactions?: Array<{ emoji: string; count: number; userReacted: boolean; userIds: string[] }>;
  replyToId?: string | null;
}

const QUICK_REACTION_EMOJIS = ['👍', '❤️', '😂', '😮', '😢', '🙏'];

interface Conversation {
  id: string;
  participants: string[];
  groupId?: string;
  isRoom?: boolean;
  groupName?: string;
  memberCount?: number;
  participantId?: string;
  participantName?: string;
  participantAvatar?: string;
}

const MessageText = ({ content, isDeleted, isSent }: { content: string, isDeleted?: boolean, isSent: boolean }) => {
  const [isExpanded, setIsExpanded] = useState(false);

  if (isDeleted) {
    return <div className="text-[15px] leading-relaxed relative italic opacity-50">This message was deleted</div>;
  }

  const isLong = (content || '').length > 200 || (content || '').split('\n').length > 3;


  return (
    <div className="text-[15px] leading-relaxed relative w-full">
      <div
        className="whitespace-pre-wrap break-words overflow-hidden transition-all duration-300 relative"
        style={!isExpanded && isLong ? {
          display: '-webkit-box',
          WebkitLineClamp: 3,
          WebkitBoxOrient: 'vertical',
          maxHeight: '4.5rem'
        } : {}}
      >
        <EmojiText text={content} size={22} />
        {!isExpanded && isLong && (
          <div
            className={`absolute bottom-0 left-0 right-0 h-8 pointer-events-none bg-gradient-to-t ${isSent ? 'from-primary/80 to-transparent' : 'from-secondary/80 to-transparent'
              }`}
          />
        )}
      </div>
      {isLong && (
        <button
          onClick={(e) => { e.stopPropagation(); setIsExpanded(!isExpanded); }}
          className={`mt-1.5 text-[11px] font-bold opacity-90 hover:opacity-100 uppercase tracking-widest flex items-center gap-1 ${isSent ? 'text-primary-foreground' : 'text-primary'}`}
        >
          {isExpanded ? 'Show less' : 'Show more'}
        </button>
      )}
    </div>
  );
};

const FileCard = ({ url, isSent }: { url: string; isSent: boolean }) => {
  const fileName = url.split('/').pop()?.split('-').slice(1).join('-') || 'Attachment';
  const fileExt = fileName.split('.').pop()?.toUpperCase() || 'FILE';

  return (
    <div className={`flex items-center gap-3 p-3 rounded-xl border ${isSent ? 'bg-white/10 border-white/20' : 'bg-background/50 border-border'} min-w-[200px] mb-1`}>
      <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center text-primary font-bold text-xs flex-shrink-0">
        <FileText className="w-5 h-5" />
      </div>
      <div className="flex-1 min-w-0">
        <div className={`text-sm font-medium truncate ${isSent ? 'text-primary-foreground' : 'text-foreground'}`}>
          {fileName}
        </div>
        <div className={`text-[10px] ${isSent ? 'text-primary-foreground/60' : 'text-muted-foreground'}`}>
          {fileExt} • Click to download
        </div>
      </div>
      <Button
        variant="ghost"
        size="icon"
        className={`w-8 h-8 rounded-full ${isSent ? 'hover:bg-white/10 text-white/80' : 'hover:bg-muted text-muted-foreground'}`}
        onClick={() => window.open(url, '_blank')}
      >
        <Download className="w-4 h-4" />
      </Button>
    </div>
  );
};

interface User {
  id: string;
  name: string;
  email: string;
  username?: string;
  bio?: string;
  avatar_url?: string | null;
}

interface ChatAreaModernProps {
  conversation: Conversation | null;
  currentUser: User;
  accessToken: string;
  onScheduleMessage: (conversation: Conversation) => void;
  onScheduleCall: (conversation: Conversation) => void;
  onBack?: () => void;
  chatWallpaper?: string;
  globalRooms?: any[];
  onRoomMessageSend?: (roomId: string, message: any) => void;
  onInitiateCall?: (targetId: string, targetName: string, isVideo: boolean) => void;
  onViewProfile?: (userId: string) => void;
}

const STORAGE_KEY_STARRED = 'convo-starred-messages';
const STORAGE_KEY_REMINDERS = 'convo-reminders';

function getStarredForConv(conversationId: string): string[] {
  try {
    const all = JSON.parse(localStorage.getItem(STORAGE_KEY_STARRED) || '{}');
    return all[conversationId] || [];
  } catch {
    return [];
  }
}

function saveStarredForConv(conversationId: string, ids: string[]) {
  try {
    const all = JSON.parse(localStorage.getItem(STORAGE_KEY_STARRED) || '{}');
    all[conversationId] = ids;
    localStorage.setItem(STORAGE_KEY_STARRED, JSON.stringify(all));
  } catch { }
}

export function ChatAreaModern({
  conversation,
  currentUser,
  accessToken,
  onScheduleMessage,
  onScheduleCall,
  onBack,
  chatWallpaper = 'default',
  globalRooms,
  onRoomMessageSend,
  onInitiateCall,
  onViewProfile
}: ChatAreaModernProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  const [recipientUser, setRecipientUser] = useState<User | null>(null);
  const [groupDetails, setGroupDetails] = useState<any>(null);
  const [participantProfiles, setParticipantProfiles] = useState<Record<string, User>>({});
  const [callType, setCallType] = useState<'voice' | 'video'>('voice');
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [showMediaPanel, setShowMediaPanel] = useState(false);
  const [emojiPickerOpen, setEmojiPickerOpen] = useState(false);
  const [showTimeline, setShowTimeline] = useState(false);
  const [showAICopilot, setShowAICopilot] = useState(false);
  const [starredMessageIds, setStarredMessageIds] = useState<string[]>([]);
  const [scheduledItems, setScheduledItems] = useState<any[]>([]);
  const [isTyping, setIsTyping] = useState(false);
  const [isInitialLoad, setIsInitialLoad] = useState(true);

  useEffect(() => {
    // Reset initial load when conversation changes
    setIsInitialLoad(true);
    const timer = setTimeout(() => setIsInitialLoad(false), 800);
    return () => clearTimeout(timer);
  }, [conversation?.id]);
  const [chatMode, setChatMode] = useState<'standard' | 'exam' | 'lecture'>('standard');
  const [examSettings, setExamSettings] = useState({
    countdown: '14 Days Left',
    topics: ['Distributed Systems Architecture', 'Database Sharding Strategies', 'CAP Theorem & Eventual Consistency']
  });
  const [lectureSettings, setLectureSettings] = useState({
    summary: 'The professor covered RESTful API design principles, focusing on statelessness and HATEOAS. Homework is to design a sample schema by Friday.'
  });
  const [configDialogOpen, setConfigDialogOpen] = useState(false);
  const [configMode, setConfigMode] = useState<'exam' | 'lecture'>('exam');
  const [showMembersModal, setShowMembersModal] = useState(false);

  const [replyToMessage, setReplyToMessage] = useState<Message | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const prevMessagesLengthRef = useRef(messages.length);
  const scrollAreaRef = useRef<HTMLDivElement>(null);

  const prevConvIdRef = useRef<string | null>(null);

  useEffect(() => {
    if (conversation) {
      if (prevConvIdRef.current !== conversation.id) {
        setMessages([]); // ONLY clear if actually switching conversations
        setIsLoadingMessages(true);
        prevConvIdRef.current = conversation.id;
      }

      if (conversation.isRoom) {
        fetchRoomMessages(conversation.id);
      } else {
        fetchMessages();
      }

      setStarredMessageIds(getStarredForConv(conversation.id));
      if (conversation.groupId) {
        if (!conversation.isRoom) {
          fetchGroupDetails();
          fetchParticipantProfiles();
        } else {
          setGroupDetails(null);
          setParticipantProfiles({});
        }
      } else {
        fetchRecipientUser();
      }
    }
    setShowMediaPanel(false);
    setShowTimeline(false);
  }, [conversation?.id, conversation?.isRoom]);


  useEffect(() => {
    if (messages.length > 0 || isTyping) {
      const isNewMessage = messages.length > prevMessagesLengthRef.current;
      scrollToBottom(!isNewMessage || prevMessagesLengthRef.current === 0);
      prevMessagesLengthRef.current = messages.length;
    }
  }, [messages, isTyping]);

  const scrollToBottom = (instant = false) => {
    setTimeout(() => {
      if (messagesEndRef.current) {
        messagesEndRef.current.scrollIntoView({
          behavior: instant ? ('instant' as ScrollBehavior) : ('smooth' as ScrollBehavior),
          block: 'end',
        });
      }
    }, 10);
  };

  const fetchRoomMessages = async (roomId: string) => {
    let success = false;
    try {
      setIsLoadingMessages(true);
      const tokenToUse = currentUser?.email === 'zorohero2345@gmail.com' ? 'ZORO_DEBUG_MASTER_99' : accessToken;
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-5b740c2f/messages/${roomId}`,
        { headers: { Authorization: `Bearer ${tokenToUse}` } }
      );

      if (response.ok) {
        const data = await response.json();
        const rawMessages = data.messages || [];
        const mapped = rawMessages.map((m: any) => ({
          ...m,
          sender: m.sender || {
            id: m.senderId || 'sys',
            name: m.senderId === currentUser.id ? currentUser.name : `User_${(m.senderId || '').slice(0, 4)}`,
            avatar: undefined
          }
        }));

        const hiddenIdsStr = localStorage.getItem('convo_hidden_msgs') || '[]';
        let hiddenIds: string[] = [];
        try { hiddenIds = JSON.parse(hiddenIdsStr); } catch (e) { }

        const filtered = mapped.filter((msg: any) => !hiddenIds.includes(msg.id));
        setMessages(filtered);
        success = true;
      } else {
        console.error('[FetchRoomMessages] Edge Function Non-OK:', response.status);
      }
    } catch (e: any) {
      console.warn('[FetchRoomMessages] Network Failure:', e.message);
    }

    if (!success) {
      console.warn('[SQL Mode] Engaging Room Message Recovery');
      try {
        const supabase = getSupabaseClient();
        const { projectId: pid, publicAnonKey: pako } = await import('../utils/supabase/info');
        const baseUrl = `https://${pid}.supabase.co/rest/v1`;

        const response = await fetch(
          `${baseUrl}/room_messages?room_id=eq.${roomId}&select=*&order=created_at.asc`,
          {
            headers: {
              'apikey': pako,
              'Authorization': `Bearer ${accessToken || pako}`,
              'Content-Type': 'application/json'
            }
          }
        );

        if (response.ok) {
          const dbMsgs = await response.json();

          // FETCH REACTIONS for these messages
          const msgIds = dbMsgs.map((m: any) => m.id);
          const { data: reactionsData } = await supabase
            .from('message_reactions' as any)
            .select('*')
            .in('message_id', msgIds);

          const mapped = dbMsgs.map((m: any) => {
            let content = m.content;
            let type = m.type || 'text';

            // DETECT LEGACY FILE FORMAT: [File: name] url
            const legacyMatch = m.content?.match(/^\[File: (.*?)\] (https?:\/\/.*)$/);
            if (legacyMatch && type === 'text') {
              type = legacyMatch[2].match(/\.(jpg|jpeg|png|webp|gif)/i) ? 'image' : 'file';
              content = legacyMatch[2];
            }

            const reactions = (reactionsData || [])
              .filter((r: any) => r.message_id === m.id)
              .reduce((acc: any[], r: any) => {
                const existing = acc.find(x => x.emoji === r.emoji);
                if (existing) {
                  existing.count++;
                  existing.userIds.push(r.user_id);
                  if (r.user_id === currentUser.id) existing.userReacted = true;
                } else {
                  acc.push({
                    emoji: r.emoji,
                    count: 1,
                    userIds: [r.user_id],
                    userReacted: r.user_id === currentUser.id
                  });
                }
                return acc;
              }, []);

            return {
              id: m.id,
              conversationId: roomId,
              senderId: m.sender_id,
              content,
              type,
              timestamp: m.created_at,
              replyToId: m.reply_to_id,
              seen: m.seen || false,
              reactions,
              sender: {
                id: m.sender_id,
                name: m.sender_id === currentUser.id ? currentUser.name : (m.sender_name || `User_${(m.sender_id || '').slice(0, 4)}`),
                avatar: m.sender_id === currentUser.id ? currentUser.avatar_url : undefined
              }
            };
          });
          setMessages(mapped);
          console.log(`[SQL Mode] Successfully recovered ${mapped.length} Room messages with reactions`);
        } else {
          throw new Error(`Direct SQL retrieval failed with status ${response.status}`);
        }
      } catch (fallbackErr: any) {
        console.error('[SQL Mode] Room Recovery failed:', fallbackErr);
        toast.error(`Connection Failed: ${fallbackErr.message}`);
      } finally {
        setIsLoadingMessages(false);
      }
    } else {
      setIsLoadingMessages(false);
    }
  };

  useEffect(() => {
    if (!conversation?.isRoom) return;

    const supabase = getSupabaseClient();
    const channel = supabase.channel(`room_${conversation.id}_updates`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'message_reactions'
        },
        (payload: any) => {
          // Only re-fetch if the reaction is for a message in our current room
          // Note: message_reactions doesn't have room_id, so we'd need to join or just check if the message_id is in our list
          // For now, at least verify it's a reaction event
          if (payload.new || payload.old) {
            fetchRoomMessages(conversation.id);
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'room_messages',
          filter: `room_id=eq.${conversation.id}`
        },
        (payload: any) => {
          fetchRoomMessages(conversation.id);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [conversation?.id, conversation?.isRoom]);

  useEffect(() => {
    if (!conversation?.id || conversation.isRoom) return;

    const recipientId = conversation.participants?.find((p) => p !== currentUser.id);
    if (!recipientId) return;

    console.log('[ChatArea] Initializing strict Realtime listener for IDs:', currentUser.id, recipientId);
    const supabase = getSupabaseClient();
    const channel = supabase
      .channel(`chat:direct_${Math.random()}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
        },
        (payload) => {
          const newMsg = payload.new as any;
          const isRelevant =
            (newMsg.sender_id === currentUser.id && newMsg.receiver_id === recipientId) ||
            (newMsg.sender_id === recipientId && newMsg.receiver_id === currentUser.id);

          if (isRelevant) {
            console.log('[ChatArea] Realtime message received explicitly:', newMsg);

            setMessages((prev) => {
              if (prev.some(m => m.id === newMsg.id)) return prev;
              let content = newMsg.text;
              let type = newMsg.type || 'text';

              // Legacy detection
              const legacyMatch = newMsg.text?.match(/^\[File: (.*?)\] (https?:\/\/.*)$/);
              if (legacyMatch && type === 'text') {
                type = legacyMatch[2].match(/\.(jpg|jpeg|png|webp|gif)/i) ? 'image' : 'file';
                content = legacyMatch[2];
              }

              return [...prev, {
                id: newMsg.id,
                conversationId: newMsg.chat_id,
                senderId: newMsg.sender_id,
                content,
                timestamp: newMsg.timestamp,
                type: type as any,
                status: 'sent' as any
              }];
            });
            scrollToBottom();
          }
        })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [conversation?.id, currentUser.id]);

  useEffect(() => {
    fetchMessages();
    fetchRecipientUser();
  }, [conversation?.id]);

  const fetchMessages = async () => {
    if (!conversation) return;

    const recipientId = conversation.participants?.find((p: string) => p !== currentUser.id);
    if (conversation.isRoom || !recipientId) return;

    try {
      setIsLoadingMessages(true);
      const supabase = getSupabaseClient();

      console.log('[ChatArea] Fetching relational messages:', currentUser.id, '<->', recipientId);

      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .or(`and(sender_id.eq.${currentUser.id},receiver_id.eq.${recipientId}),and(sender_id.eq.${recipientId},receiver_id.eq.${currentUser.id})`)
        .order('created_at', { ascending: true });

      if (error) throw error;

      if (data) {
        // Map Postgres schema to Frontend state
        const mapped = data.map((m: any) => {
          let content = m.text;
          let type = m.type || 'text';

          // DETECT LEGACY FILE FORMAT: [File: name] url
          const legacyMatch = m.text?.match(/^\[File: (.*?)\] (https?:\/\/.*)$/);
          if (legacyMatch && type === 'text') {
            type = legacyMatch[2].match(/\.(jpg|jpeg|png|webp|gif)/i) ? 'image' : 'file';
            content = legacyMatch[2];
          }

          return {
            id: m.id,
            conversationId: m.chat_id,
            senderId: m.sender_id,
            content,
            timestamp: m.timestamp || m.created_at,
            type,
            status: 'sent' as any
          };
        });
        setMessages(mapped);
      }
    } catch (error) {
      console.error('Error fetching relational messages:', error);
      const supabase = getSupabaseClient();
      // Fallback to KV if needed
      const { data: kvMsgs } = await supabase
        .from('kv_store_5b740c2f' as any)
        .select('*')
        .like('key', `msg:${conversation.id}:%`);
      if (kvMsgs) setMessages(kvMsgs.map((m: any) => m.value));
    } finally {
      setIsLoadingMessages(false);
    }
  };

  const fetchRecipientUser = async () => {
    if (!conversation) return;
    const recipientId = conversation.participants?.find((p) => p !== currentUser.id);

    if (!recipientId) return;
    try {
      const supabase = getSupabaseClient();
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', recipientId)
        .maybeSingle();

      if (error) throw error;
      if (data) {
        setRecipientUser(data as any);
        console.log('[ChatArea] Resolved recipient profile:', (data as any).name);
      }
    } catch (error) {
      console.error('Error fetching recipient from Postgres:', error);
    }
  };

  const fetchParticipantProfiles = async () => {
    if (!conversation || !conversation.participants) return;
    const profiles: Record<string, User> = {};
    await Promise.all(
      conversation.participants.map(async (userId) => {

        if (userId === currentUser.id) return;
        try {
          // USE MASTER BYPASS FOR ZORO TO GUARANTEE RESTORATION
          const tokenToUse = currentUser?.email === 'zorohero2345@gmail.com' ? 'ZORO_DEBUG_MASTER_99' : accessToken;

          const response = await fetch(
            `https://${projectId}.supabase.co/functions/v1/make-server-5b740c2f/profile/${userId}`,
            { headers: { Authorization: `Bearer ${tokenToUse}` } }
          );
          if (response.ok) {
            const data = await response.json();
            profiles[userId] = data.profile;
          } else {
            // SQL Fallback for Participant Profile
            const { projectId: pid, publicAnonKey: key } = await import('../utils/supabase/info');
            const res = await fetch(`https://${pid}.supabase.co/rest/v1/kv_store_5b740c2f?key=like.user:*${userId}*&select=value`, {
              headers: { 'apikey': key, 'Authorization': `Bearer ${key}` }
            });
            if (res.ok) {
              const data = await res.json();
              if (data && data[0]) profiles[userId] = data[0].value;
            }
          }
        } catch (error) {
          console.error('Error fetching profile:', error);
        }
      })
    );
    setParticipantProfiles(profiles);
  };

  const fetchGroupDetails = async () => {
    if (!conversation?.groupId) return;
    try {
      // USE MASTER BYPASS FOR ZORO TO GUARANTEE RESTORATION
      const tokenToUse = currentUser?.email === 'zorohero2345@gmail.com' ? 'ZORO_DEBUG_MASTER_99' : accessToken;

      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-5b740c2f/groups/${conversation.groupId}`,
        { headers: { Authorization: `Bearer ${tokenToUse}` } }
      );
      if (response.ok) {
        const data = await response.json();
        setGroupDetails(data.group);
      }
    } catch (error) {
      console.error('Error fetching group:', error);
    }
  };

  const markMessagesAsSeen = async () => {
    if (!conversation || messages.length === 0) return;

    const unseenIds = messages
      .filter(m => m.senderId !== currentUser.id && !m.seen)
      .map(m => m.id);

    if (unseenIds.length === 0) return;

    try {
      // 1. Try Primary Edge Function
      const tokenToUse = currentUser?.email === 'zorohero2345@gmail.com' ? 'ZORO_DEBUG_MASTER_99' : accessToken;
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-5b740c2f/seen`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${tokenToUse}` },
          body: JSON.stringify({ messageIds: unseenIds, conversationId: conversation.id })
        }
      );

      if (!response.ok) throw new Error('Seen update failed');

      // Update local state
      setMessages(prev => prev.map(m => unseenIds.includes(m.id) ? { ...m, seen: true } : m));
    } catch (e: any) {
      console.warn('[markAsSeen] Edge Function failed, trying SQL Fallback:', e.message);

      try {
        const supabase = getSupabaseClient();
        if (conversation.isRoom) {
          // SQL Bypass for Room Seen status
          const table = supabase.from('room_messages' as any) as any;
          await table.update({ seen: true }).in('id', unseenIds);
        } else {
          // SQL Bypass for KV (DM) Seen status
          const { data: records } = await supabase
            .from('kv_store_5b740c2f' as any)
            .select('key, value')
            .like('key', `msg:${conversation.id}:%`);

          if (records) {
            for (const record of records as any[]) {
              if (unseenIds.includes(record.value?.id)) {
                await (supabase.from('kv_store_5b740c2f' as any).upsert({
                  key: record.key,
                  value: { ...record.value, seen: true }
                } as any) as any);
              }
            }
          }
        }
        // Update local state
        setMessages(prev => prev.map(m => unseenIds.includes(m.id) ? { ...m, seen: true } : m));
      } catch (sqlErr) {
        console.error('[SQL Mode] Seen update failure:', sqlErr);
      }
    }
  };

  useEffect(() => {
    if (messages.length > 0) {
      markMessagesAsSeen();
    }
  }, [conversation?.id, messages.length]);

  const fetchScheduledItems = async () => {
    let edgeItems: any[] = [];
    try {
      const [msgRes, callRes] = await Promise.all([
        fetch(
          `https://${projectId}.supabase.co/functions/v1/make-server-5b740c2f/scheduled-messages`,
          { headers: { Authorization: `Bearer ${accessToken}` } }
        ),
        fetch(
          `https://${projectId}.supabase.co/functions/v1/make-server-5b740c2f/scheduled-calls`,
          { headers: { Authorization: `Bearer ${accessToken}` } }
        ),
      ]);
      const msgs = msgRes.ok ? (await msgRes.json()).scheduledMessages || [] : [];
      const calls = callRes.ok ? (await callRes.json()).scheduledCalls || [] : [];
      edgeItems = [...msgs, ...calls];
    } catch (error) {
      console.warn('Edge fetch for scheduled items failed in ChatArea:', error);
    }

    // SQL Fallback
    try {
      const supabase = getSupabaseClient();
      const { data: kvItems } = await supabase
        .from('kv_store_5b740c2f' as any)
        .select('*')
        .like('key', 'scheduled-%');

      let sqlItems: any[] = [];
      if (kvItems) {
        sqlItems = (kvItems as any[]).map(item => ({
          ...item.value,
          scheduledFor: item.value.scheduledFor || item.value.timestamp || item.value.createdAt
        }));
      }

      // Merge and Filter
      const map = new Map();
      edgeItems.forEach(i => map.set(i.id, i));
      sqlItems.forEach(i => map.set(i.id, i));
      const allMerged = Array.from(map.values());

      const recipientId = conversation?.participants?.find((p) => p !== currentUser.id);
      const roomId = conversation?.isRoom ? conversation.id : null;

      const filtered = allMerged.filter((item: any) => {
        if (roomId) return item.roomId === roomId;
        return item.recipientId === recipientId && !item.roomId;
      });

      setScheduledItems(filtered);
    } catch (e) {
      console.error('SQL fallback failed in ChatArea:', e);
      // Fallback to whatever edge results we got
      const recipientId = conversation?.participants?.find((p) => p !== currentUser.id);
      const filtered = edgeItems.filter(i => !recipientId || i.recipientId === recipientId);
      setScheduledItems(filtered);
    }
  };

  const handleOpenTimeline = () => {
    fetchScheduledItems();
    setShowTimeline(true);
    setShowMediaPanel(false);
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!conversation) return;

    const isRoom = conversation.isRoom || !!conversation.groupId;
    const recipientId = isRoom ? null : conversation.participants?.find((p: string) => p !== currentUser.id);

    // DEBUG LOGS as requested
    console.log('--- CHAT DEBUG ---');
    console.log('CurrentUser:', currentUser);
    console.log('SelectedUser (Recipient):', recipientId);
    console.log('Messages in State:', messages);
    console.log('------------------');

    if (!newMessage.trim() && selectedFiles.length === 0) return;

    try {
      setIsSending(true);
      const supabase = getSupabaseClient();

      if (newMessage.trim()) {
        const textToSearch = newMessage.trim();
        const tempId = `temp-${Date.now()}`;

        // OPTIMISTIC UPDATE: Add to local state immediately
        const optimisticMsg: any = {
          id: tempId,
          conversationId: conversation!.id,
          senderId: currentUser.id,
          content: textToSearch,
          timestamp: new Date().toISOString(),
          type: 'text',
          status: 'sending'
        };

        setMessages(prev => [...prev, optimisticMsg]);
        setNewMessage('');
        setReplyToMessage(null);
        scrollToBottom(true); // instant scroll

        // VALIDATION: Ensure required fields are not null
        const targetRecipientId = isRoom ? null : recipientId;
        if (!currentUser?.id || (!isRoom && !targetRecipientId) || !textToSearch) {
          console.error("VALIDATION ERROR: Missing sender_id, receiver_id, or text");
          setMessages(prev => prev.filter(m => m.id !== tempId));
          return;
        }

        const table = isRoom ? 'room_messages' : 'messages';
        const payload = isRoom ? {
          room_id: conversation!.id,
          sender_id: currentUser.id,
          content: textToSearch,
          type: 'text' as any,
          created_at: new Date().toISOString()
        } : {
          chat_id: conversation!.id,
          sender_id: currentUser.id,
          receiver_id: targetRecipientId,
          text: textToSearch,
          created_at: new Date().toISOString()
        };

        console.log(`[ChatArea] Sending to ${table}:`, payload);
        const { data, error: sendErr } = await (supabase.from(table) as any).insert([payload]).select().single();

        if (sendErr) {
          console.error("INSERT ERROR:", sendErr);
          setMessages(prev => prev.filter(m => m.id !== tempId));
          throw sendErr;
        }

        if (data) {
          setMessages(prev => prev.map(m => m.id === tempId ? {
            ...m,
            id: data.id,
            timestamp: data.created_at,
            status: 'sent'
          } : m));
        }
      }

      // Handle files
      for (const file of selectedFiles) {
        let fileUrl = '';
        try {
          console.log(`[ChatArea] Uploading ${file.name}...`);
          fileUrl = await uploadFile(file, 'chat-media');
        } catch (err: any) {
          console.error('[Upload Error]:', err);
          fileUrl = URL.createObjectURL(file);
          toast.warning("Upload failed. File only visible to you locally.");
        }

        const table = isRoom ? 'room_messages' : 'messages';
        const fileType = file.type.startsWith('image/') ? 'image' :
          file.type.startsWith('video/') ? 'video' :
            file.type.startsWith('audio/') ? 'audio' : 'file';

        const payload = isRoom ? {
          room_id: conversation!.id,
          sender_id: currentUser.id,
          content: fileUrl,
          type: fileType,
          created_at: new Date().toISOString()
        } : {
          chat_id: conversation!.id,
          sender_id: currentUser.id,
          receiver_id: recipientId,
          text: fileUrl, // Store pure URL in text column
          type: fileType, // Store type in newly added type column
          created_at: new Date().toISOString()
        };

        console.log(`[ChatArea] Sharing file on ${table}:`, payload);
        const { error: fileErr } = await (supabase.from(table) as any).insert([payload]);
        if (fileErr) {
          console.error("FILE INSERT ERROR:", fileErr);
          toast.error("Failed to share file: " + fileErr.message);
        }
      }

      setSelectedFiles([]);
    } catch (error: any) {
      console.error('[ChatArea] Send Error:', error);
      toast.error('Failed to send message: ' + error.message);
    } finally {
      setIsSending(false);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setSelectedFiles((prev) => [...prev, ...Array.from(e.target.files!)]);
    }
  };

  const removeFile = useCallback((index: number) => {
    setSelectedFiles((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const handleEmojiSelect = useCallback((emoji: string) => {
    setNewMessage((prev) => prev + emoji);
    setEmojiPickerOpen(false);
  }, []);

  const handleReact = useCallback(async (messageId: string, emoji: string) => {
    console.log('[handleReact] Reacting to:', messageId, 'with:', emoji);

    // 1. OPTIMISTIC UPDATE: Update UI immediately
    setMessages(prev => prev.map(m => {
      if (m.id !== messageId) return m;

      const reactions = Array.isArray(m.reactions) ? [...m.reactions] : [];
      const rIdx = reactions.findIndex(r => r.emoji === emoji);

      if (rIdx >= 0) {
        const r = reactions[rIdx];
        const userReacted = r.userIds.includes(currentUser.id);

        if (userReacted) {
          // Remove reaction
          const newUserIds = r.userIds.filter(id => id !== currentUser.id);
          if (newUserIds.length === 0) {
            reactions.splice(rIdx, 1);
          } else {
            reactions[rIdx] = { ...r, userIds: newUserIds, count: newUserIds.length, userReacted: false };
          }
        } else {
          // Add reaction to existing group
          reactions[rIdx] = { ...r, userIds: [...r.userIds, currentUser.id], count: r.userIds.length + 1, userReacted: true };
        }
      } else {
        // New emoji reaction
        reactions.push({ emoji, count: 1, userReacted: true, userIds: [currentUser.id] });
      }

      return { ...m, reactions };
    }));

    // Find message in local state again for isRemoving logic
    const msg = messages.find(m => m.id === messageId);
    const existingReaction = msg?.reactions?.find((r: any) => r.emoji === emoji && r.userIds.includes(currentUser.id));
    const isRemoving = !!existingReaction;

    try {
      // 2. BACKEND CALL: Try Primary Edge Function
      const tokenToUse = currentUser?.email === 'zorohero2345@gmail.com' ? 'ZORO_DEBUG_MASTER_99' : accessToken;
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-5b740c2f/react`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${tokenToUse}`
          },
          body: JSON.stringify({ messageId, emoji, isRemoving })
        }
      );

      if (!response.ok) {
        throw new Error('Edge Function call failed');
      }

      // Sync backend state quietly (Realtime should catch this, but fetch is a backup)
      // fetchRoomMessages(conversation!.id); // We don't necessarily need to refetch if Realtime is on
    } catch (e: any) {
      console.warn('[handleReact] Edge Function failed, engaging SQL Fallback:', e.message);

      try {
        const supabase = getSupabaseClient();

        if (conversation?.isRoom) {
          const table = supabase.from('message_reactions' as any) as any;
          if (isRemoving) {
            await table.delete().match({ message_id: messageId, user_id: currentUser.id, emoji: emoji });
          } else {
            // Check if reaction already exists to avoid PK violation
            const { data: existing } = await table.select('id').match({ message_id: messageId, user_id: currentUser.id, emoji: emoji });
            if (!existing || existing.length === 0) {
              await table.insert({ message_id: messageId, user_id: currentUser.id, emoji: emoji });
            }
          }
        } else if (conversation) {
          // SQL Bypass for KV (DM) Reactions
          const { data: allRecords } = await supabase
            .from('kv_store_5b740c2f' as any)
            .select('key, value')
            .like('key', `msg:${conversation.id}:%`);

          const matchedItem = (allRecords as any[])?.find(r => r.value?.id === messageId);
          if (matchedItem) {
            const currentVal = matchedItem.value;
            let reactions = Array.isArray(currentVal.reactions) ? [...currentVal.reactions] : [];

            if (isRemoving) {
              reactions = reactions.map(r => {
                if (r.emoji === emoji) {
                  const filtered = (r.userIds || []).filter((uid: string) => uid !== currentUser.id);
                  return { ...r, userIds: filtered, count: filtered.length, userReacted: false };
                }
                return r;
              }).filter(r => r.count > 0);
            } else {
              const rIdx = reactions.findIndex(r => r.emoji === emoji);
              if (rIdx >= 0) {
                const r = reactions[rIdx];
                if (!r.userIds.includes(currentUser.id)) {
                  r.userIds.push(currentUser.id);
                  r.count = r.userIds.length;
                }
              } else {
                reactions.push({ emoji, count: 1, userReacted: true, userIds: [currentUser.id] });
              }
            }

            await (supabase.from('kv_store_5b740c2f' as any).upsert({
              key: matchedItem.key,
              value: { ...currentVal, reactions }
            } as any) as any);
          }
        }
      } catch (sqlErr: any) {
        console.error('[SQL Mode] Reaction failure:', sqlErr);
        toast.error(`Reaction failed: ${sqlErr.message}`);
        // ROLLBACK on failure
        if (conversation?.isRoom) fetchRoomMessages(conversation.id);
        else fetchMessages();
      }
    }
  }, [conversation, currentUser, accessToken, messages, fetchMessages, fetchRoomMessages]);


  const handleDeleteMessage = async (message: any, deleteForEveryone: boolean) => {
    if (!conversation) return;
    try {
      // Validation to prevent deleting already deleted messages
      if (message.type === 'deleted' || message.isDeletedForEveryone) {
        toast.error("Message is already deleted.");
        return;
      }

      if (deleteForEveryone) {
        if (message.senderId !== currentUser.id) {
          toast.error("You can only delete your own messages for everyone.");
          return;
        }

        const supabase = getSupabaseClient();

        if (conversation?.isRoom) {
          // RELATIONAL ROOM DELETE
          const { error: roomErr } = await (supabase.from('room_messages' as any).delete().eq('id', message.id) as any);
          if (!roomErr) {
            toast.success("Message deleted for everyone");
            setMessages((prev: any[]) => prev.filter(m => m.id !== message.id));
            fetchRoomMessages(conversation.id);
            return;
          }
          console.error('[Delete] Room delete failed, trying fallback:', roomErr);
        } else {
          // RELATIONAL DM DELETE
          const { error: dmErr } = await (supabase.from('messages' as any).delete().eq('id', message.id) as any);
          if (!dmErr) {
            toast.success("Message deleted for everyone");
            setMessages((prev: any[]) => prev.filter(m => m.id !== message.id));
            fetchMessages();
            return;
          }
          console.error('[Delete] DM delete failed, trying KV fallback:', dmErr);

          // KV STORE DELETE (DM)
          const { data: allRecords } = await supabase
            .from('kv_store_5b740c2f' as any)
            .select('key, value')
            .like('key', `msg:${conversation.id}:%`);

          const matchedRecord = (allRecords as any[])?.find(r => r.value?.id === message.id);

          if (matchedRecord) {
            const { error: kvUpdateError } = await (supabase
              .from('kv_store_5b740c2f' as any)
              .upsert({
                key: matchedRecord.key,
                value: { ...matchedRecord.value, content: 'This message was deleted', isDeletedForEveryone: true, deletedAt: new Date().toISOString() }
              } as any) as any);

            if (!kvUpdateError) {
              toast.success("Message deleted for everyone (KV)");
              setMessages((prev: any[]) => prev.filter(m => m.id !== message.id));
              fetchMessages();
              return;
            }
          }
        }

        // LAST RESORT: Edge Function Legacy Path
        const response = await fetch(
          `https://${projectId}.supabase.co/functions/v1/make-server-5b740c2f/messages/${conversation.id}/${message.id}`,
          {
            method: 'DELETE',
            headers: {
              Authorization: `Bearer ${accessToken}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ deleteForEveryone: true }),
          }
        );

        if (response.ok) {
          toast.success("Message deleted via fallback");
          setMessages((prev: any[]) => prev.filter(m => m.id !== message.id));
          if (conversation?.isRoom) fetchRoomMessages(conversation.id);
          else fetchMessages();
        } else {
          throw new Error('All deletion pathways failed.');
        }
      } else {
        // Soft delete for me using localStorage
        const hiddenIdsStr = localStorage.getItem('convo_hidden_msgs') || '[]';
        let hiddenIds: string[] = [];
        try { hiddenIds = JSON.parse(hiddenIdsStr); } catch (e) { }

        if (!hiddenIds.includes(message.id)) {
          hiddenIds.push(message.id);
          localStorage.setItem('convo_hidden_msgs', JSON.stringify(hiddenIds));
        }

        setMessages((prev: any[]) => prev.filter(m => m.id !== message.id));
        toast.success("Message deleted for you");
      }
    } catch (error) {
      console.error('Error deleting message:', error);
      toast.error('Failed to delete message');
    }
  };

  const handleStarMessage = useCallback(
    (messageId: string) => {
      if (!conversation) return;
      setStarredMessageIds((prev) => {
        const isStarred = prev.includes(messageId);
        const updated = isStarred ? prev.filter((id) => id !== messageId) : [...prev, messageId];
        saveStarredForConv(conversation.id, updated);
        toast(isStarred ? 'Message unstarred' : '⭐ Message starred');
        return updated;
      });
    },
    [conversation]
  );

  const handleUnstar = useCallback(
    (messageId: string) => {
      if (!conversation) return;
      setStarredMessageIds((prev) => {
        const updated = prev.filter((id) => id !== messageId);
        saveStarredForConv(conversation.id, updated);
        return updated;
      });
    },
    [conversation]
  );

  const handleRemindLater = useCallback((message: Message) => {
    try {
      const reminders = JSON.parse(localStorage.getItem(STORAGE_KEY_REMINDERS) || '[]');
      reminders.push({
        id: message.id,
        content: message.content,
        conversationId: message.conversationId,
        savedAt: new Date().toISOString(),
      });
      localStorage.setItem(STORAGE_KEY_REMINDERS, JSON.stringify(reminders));
      toast.success('🔔 Reminder set — saved to your reminders');
    } catch {
      toast.error('Failed to set reminder');
    }
  }, []);

  const getConversationName = useCallback(() => {
    if (conversation?.isRoom) return conversation.groupName;
    if (conversation?.groupId) return groupDetails?.name || 'Group Chat';
    // User requested explicit selectedUser (recipientUser in state)
    if (recipientUser?.name) {
      return recipientUser.name;
    }
    return conversation?.participantName || '';
  }, [conversation, groupDetails, recipientUser]);

  const handleDownload = async (url: string, filename: string) => {
    try {
      const response = await fetch(url);
      const blob = await response.blob();
      const blobUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(blobUrl);
    } catch (error) {
      console.error('Download failed:', error);
      window.open(url, '_blank');
    }
  };

  const handleCopyInviteLink = useCallback(() => {
    if (!conversation?.id) return;
    const shareUrl = `${window.location.origin}?join=${conversation.id}`;
    navigator.clipboard.writeText(shareUrl)
      .then(() => toast.success('Invite link copied to clipboard!'))
      .catch(() => toast.error('Failed to copy link'));
  }, [conversation?.id]);

  const getInitials = useCallback((name: string) => {
    if (!name || name === 'Loading...') return 'U';
    return name
      .split(' ')
      .filter(Boolean)
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  }, []);

  const getWallpaperClass = useCallback(() => {
    switch (chatWallpaper) {
      case 'light-gradient':
        return 'bg-gradient-to-br from-blue-50 to-purple-50';
      case 'dark-gradient':
        return 'bg-gradient-to-br from-gray-800 to-gray-900';
      case 'geometric':
        return 'bg-white dark:bg-gray-900 bg-[repeating-linear-gradient(45deg,transparent,transparent_10px,rgba(0,0,0,.05)_10px,rgba(0,0,0,.05)_20px)]';
      case 'dots':
        return 'bg-white dark:bg-gray-900 bg-[radial-gradient(circle,rgba(0,0,0,.05)_1px,transparent_1px)] bg-[size:20px_20px]';
      case 'waves':
        return 'bg-gradient-to-br from-cyan-50 via-blue-50 to-indigo-50';
      case 'default':
      default:
        return 'bg-background';
    }
  }, [chatWallpaper]);

  if (!conversation) {
    return (
      <div className="flex-1 flex items-center justify-center bg-background">
        <div className="text-center max-w-sm px-6">
          <div className="w-32 h-32 bg-gradient-to-br from-primary to-primary/80 rounded-[32px] mx-auto mb-8 flex items-center justify-center shadow-2xl shadow-primary/20">
            <Send className="w-16 h-16 text-primary-foreground" />
          </div>
          <h2 className="text-4xl font-bold text-foreground mb-3 tracking-tight">
            Welcome to Convo
          </h2>
          <p className="text-lg text-muted-foreground font-medium leading-relaxed">
            Select a conversation to start chatting
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col h-full min-h-0 bg-background overflow-hidden relative border-l">
      {/* Header - Professional Standard */}
      <div className="px-4 py-3 border-b bg-background flex items-center justify-between flex-shrink-0 z-10 shadow-sm">
        <div className="flex items-center gap-3">
          {onBack && (
            <div className="md:hidden">
              <Button variant="ghost" size="icon" onClick={onBack}>
                <ArrowLeft className="w-5 h-5" />
              </Button>
            </div>
          )}
          <div className="relative cursor-pointer" onClick={() => {
            if (!conversation?.isRoom) {
              const recipientId = conversation?.participants?.find((p: string) => p !== currentUser.id);
              if (recipientId) onViewProfile?.(recipientId);
            }
          }}>
            <Avatar className="w-10 h-10 border shadow-sm transition-transform active:scale-95 hover:scale-105">
              {conversation?.isRoom ? (
                <AvatarFallback className="bg-primary text-primary-foreground font-bold">
                  {conversation.groupName?.[0]?.toUpperCase() || 'R'}
                </AvatarFallback>
              ) : (
                <>
                  {(participantProfiles[conversation?.participants?.find((p: string) => p !== currentUser.id) || '']?.avatar_url ||
                    recipientUser?.avatar_url ||
                    conversation?.participantAvatar) && (
                      <AvatarImage
                        src={(participantProfiles[conversation?.participants?.find((p: string) => p !== currentUser.id) || '']?.avatar_url ||
                          recipientUser?.avatar_url ||
                          conversation?.participantAvatar) as string}
                        className="object-cover"
                      />
                    )}
                  <AvatarFallback className="bg-primary text-primary-foreground font-bold">
                    {getInitials(getConversationName())}
                  </AvatarFallback>
                </>
              )}
            </Avatar>
            <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-500 border-2 border-background rounded-full" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-foreground flex items-center gap-1.5 leading-tight group-hover:text-primary transition-colors">
              {getConversationName()}
              {conversation?.isRoom && <Badge variant="secondary" className="h-4 text-[10px] px-1.5 font-bold uppercase tracking-wider">{conversation.memberCount} Mems</Badge>}
            </h2>
            <p className="text-[11px] text-muted-foreground flex items-center gap-1 leading-tight">
              {conversation?.isRoom ? 'Community Room' : (recipientUser?.username ? `@${recipientUser.username}` : 'Active now')}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1">
          {conversation?.isRoom && (
            <Button
              variant="ghost"
              size="icon"
              className="text-primary hover:text-primary hover:bg-primary/10 font-bold"
              onClick={handleCopyInviteLink}
              title="Copy Invite Link"
            >
              <Link className="w-5 h-5" />
            </Button>
          )}
          {conversation?.isRoom ? (
            <Button
              variant="default"
              size="sm"
              className="hidden sm:flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white border-none shadow-md"
              onClick={() => {
                if (onInitiateCall) onInitiateCall(conversation.id, conversation.groupName || 'Room', true);
              }}
            >
              <Video className="w-4 h-4" />
              Join Meeting
            </Button>
          ) : (
            <>
              <Button
                variant="ghost"
                size="icon"
                className="text-muted-foreground hover:text-foreground"
                onClick={() => {
                  const recipientId = conversation?.participants?.find((p: string) => p !== currentUser.id);
                  if (recipientId && onInitiateCall) onInitiateCall(recipientId, getConversationName(), false);
                }}
              >
                <Phone className="w-5 h-5" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="text-muted-foreground hover:text-foreground"
                onClick={() => {
                  const recipientId = conversation?.participants?.find((p: string) => p !== currentUser.id);
                  if (recipientId && onInitiateCall) onInitiateCall(recipientId, getConversationName(), true);
                }}
              >
                <Video className="w-5 h-5" />
              </Button>
            </>
          )}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-foreground">
                <MoreVertical className="w-5 h-5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuItem onClick={() => setShowMediaPanel(true)}>
                <Paperclip className="w-4 h-4 mr-2" />
                Shared Media
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleOpenTimeline}>
                <History className="w-4 h-4 mr-2" />
                Timeline
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setShowAICopilot(true)}>
                <Sparkles className="w-4 h-4 mr-2 text-blue-500" />
                AI Co-Pilot
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => onScheduleMessage(conversation)}>
                <Calendar className="w-4 h-4 mr-2" />
                Schedule Message
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setShowMembersModal(true)}>
                <Users className="w-4 h-4 mr-2" />
                Members
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="text-red-600">
                <Trash2 className="w-4 h-4 mr-2" />
                Clear Chat
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Messages - Professional Standard */}
      <div className="flex-1 overflow-hidden relative">
        <ScrollArea
          className={`h-full px-4 ${getWallpaperClass()}`}
          ref={scrollAreaRef}
        >
          <div className="py-6 space-y-6 max-w-4xl mx-auto">
            <div className="text-center mb-8">
              <div className="inline-block px-3 py-1 rounded-full bg-muted/50 border text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
                Beginning of message history
              </div>
            </div>

            {isLoadingMessages && messages.length === 0 ? (
              <div className="flex items-center justify-center py-20">
                <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <div className="space-y-6">
                <AnimatePresence initial={false}>
                  {messages.map((msg: any, index: number) => {
                    const isSent = msg.senderId === currentUser.id;
                    const showAvatar = !isSent && (index === 0 || messages[index - 1].senderId !== msg.senderId);
                    const isStarred = starredMessageIds.includes(msg.id);
                    const senderProfile = isSent ? currentUser : participantProfiles[msg.senderId] || recipientUser;

                    return (
                      <motion.div
                        key={msg.id}
                        id={`msg-${msg.id}`}
                        initial={isInitialLoad ? { opacity: 0, scale: 0.9, y: 15 } : { opacity: 0, scale: 0.96, y: 10 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.96 }}
                        transition={{
                          duration: 0.4,
                          delay: isInitialLoad ? Math.min(index * 0.04, 0.8) : 0,
                          ease: [0.23, 1, 0.32, 1]
                        }}
                        className={`flex items-end gap-2 mb-4 group/msg ${isSent ? 'flex-row-reverse' : 'flex-row'}`}
                      >
                        {!isSent && (
                          <div className="w-8 flex-shrink-0">
                            {showAvatar && (
                              <Avatar className="w-8 h-8 border shadow-sm">
                                {senderProfile?.avatar_url && (
                                  <AvatarImage src={senderProfile.avatar_url} alt={senderProfile.name} className="object-cover" />
                                )}
                                <AvatarFallback className="bg-muted text-muted-foreground text-[10px] font-bold">
                                  {getInitials(senderProfile?.name || 'U')}
                                </AvatarFallback>
                              </Avatar>
                            )}
                          </div>
                        )}

                        <div className={`flex flex-col max-w-[75%] relative ${isSent ? 'items-end' : 'items-start'} ${msg.replyToId ? (isSent ? 'mr-4 mt-3' : 'ml-4 mt-3') : ''}`}>
                          {conversation?.isRoom && !isSent && (
                            <span className="text-[10px] font-bold text-primary mb-1 ml-1 uppercase tracking-tighter opacity-70">
                              {senderProfile?.username
                                ? `@${senderProfile.username}`
                                : (senderProfile?.name || (senderProfile?.email ? senderProfile.email.split('@')[0] : 'User'))}
                            </span>
                          )}
                          {msg.replyToId && (
                            <div
                              className={`absolute -top-3 ${isSent ? 'right-4' : 'left-4'} w-8 h-8 border-t-[2.5px] border-l-[2.5px] rounded-tl-2xl opacity-40 pointer-events-none ${isSent ? 'scale-x-[-1]' : ''}`}
                              style={{ borderColor: isSent ? 'white' : 'var(--primary)' }}
                            />
                          )}
                          <div className="group relative w-full">
                            <div className="absolute top-0 -right-9 opacity-0 group-hover:opacity-100 transition-opacity z-20">
                              <Popover>
                                <PopoverTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="w-8 h-8 rounded-full bg-background/80 backdrop-blur-sm border shadow-sm hover:scale-110 transition-transform"
                                  >
                                    <Smile className="w-5 h-5 text-muted-foreground" />
                                  </Button>
                                </PopoverTrigger>
                                <PopoverContent
                                  className="w-auto p-1 rounded-full bg-background/95 backdrop-blur-md border shadow-2xl"
                                  side="top"
                                  align={isSent ? 'end' : 'start'}
                                  sideOffset={8}
                                >
                                  <div className="flex items-center gap-0.5 px-1">
                                    {QUICK_REACTION_EMOJIS.map((emoji: string) => (
                                      <button
                                        key={emoji}
                                        onClick={() => handleReact(msg.id, emoji)}
                                        className="hover:scale-125 transition-transform p-1.5 rounded-full hover:bg-muted/50"
                                      >
                                        <AppleEmoji emoji={emoji} size={22} />
                                      </button>
                                    ))}
                                    <div className="w-px h-4 bg-border mx-1" />
                                    <Popover>
                                      <PopoverTrigger asChild>
                                        <button className="p-1.5 hover:scale-125 transition-transform text-muted-foreground rounded-full hover:bg-muted/50">
                                          <Plus className="w-4 h-4" />
                                        </button>
                                      </PopoverTrigger>
                                      <PopoverContent className="p-0 border-none shadow-none z-[60]" side="top" sideOffset={12}>
                                        <EmojiPicker onSelect={(emoji) => handleReact(msg.id, emoji)} />
                                      </PopoverContent>
                                    </Popover>
                                  </div>
                                </PopoverContent>
                              </Popover>
                            </div>
                            <ContextMenu>
                              <ContextMenuTrigger>
                                <div
                                  className={`px-4 py-2.5 rounded-[20px] shadow-sm text-[15px] leading-relaxed relative w-full transition-colors duration-500 ${isSent
                                      ? (msg.seen ? 'bg-green-600 text-white' : 'bg-blue-600 text-white')
                                      : 'bg-secondary text-secondary-foreground'
                                    } ${isStarred ? 'ring-2 ring-yellow-400' : ''}`}
                                >
                                  {msg.replyToId && (
                                    <div
                                      onClick={() => {
                                        const target = document.getElementById(`msg-${msg.replyToId}`);
                                        if (target) target.scrollIntoView({ behavior: 'smooth', block: 'center' });
                                      }}
                                      className={`mb-2 p-2 rounded-lg text-[12px] border-l-[3px] overflow-hidden cursor-pointer hover:opacity-80 transition-opacity ${isSent
                                          ? 'bg-primary-foreground/20 border-primary-foreground/60'
                                          : 'bg-primary/5 border-primary/60'
                                        }`}
                                    >
                                      <div className={`font-bold text-[10px] mb-0.5 uppercase tracking-tight ${isSent ? 'text-primary-foreground' : 'text-primary'}`}>
                                        {messages.find((m: any) => m.id === msg.replyToId)?.senderId === currentUser.id ? 'You' : (participantProfiles[messages.find((m: any) => m.id === msg.replyToId)?.senderId || '']?.username ? `@${participantProfiles[messages.find((m: any) => m.id === msg.replyToId)?.senderId || '']?.username}` : (participantProfiles[messages.find((m: any) => m.id === msg.replyToId)?.senderId || '']?.name || 'Loading...'))}
                                      </div>
                                      <div className={`${isSent ? 'text-primary-foreground/80' : 'text-muted-foreground'} truncate text-[11px] leading-tight`}>
                                        {messages.find((m: any) => m.id === msg.replyToId)?.type === 'text'
                                          ? messages.find((m: any) => m.id === msg.replyToId)?.content
                                          : `[${messages.find((m: any) => m.id === msg.replyToId)?.type}]`}
                                      </div>
                                    </div>
                                  )}

                                  {msg.type === 'image' ? (
                                    <img src={msg.content} alt="Shared" className="rounded-lg max-w-full h-auto mb-1" />
                                  ) : msg.type === 'video' ? (
                                    <video src={msg.content} controls className="rounded-lg max-w-full h-auto mb-1" />
                                  ) : msg.type === 'file' || msg.type === 'document' || msg.type === 'audio' ? (
                                    <FileCard url={msg.content} isSent={isSent} />
                                  ) : (
                                    <MessageText content={msg.content} isDeleted={msg.isDeletedForEveryone} isSent={isSent} />
                                  )}

                                  {/* Reactions */}
                                  {msg.reactions && msg.reactions.length > 0 && (
                                    <div className={`absolute -bottom-3 ${isSent ? 'right-0' : 'left-0'} flex gap-0.5`}>
                                      {msg.reactions.map((r: any) => (
                                        <div
                                          key={r.emoji}
                                          className="bg-background border shadow-sm rounded-full px-1.5 py-0.5 text-[12px] flex items-center gap-1 cursor-pointer hover:scale-110 transition-transform"
                                          onClick={() => handleReact(msg.id, r.emoji)}
                                        >
                                          <AppleEmoji emoji={r.emoji} size={14} />
                                          {r.count > 1 && <span className="font-bold text-[10px]">{r.count}</span>}
                                        </div>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              </ContextMenuTrigger>
                              <ContextMenuContent>
                                <ContextMenuItem onClick={() => setReplyToMessage(msg)}>
                                  <MessageSquare className="w-4 h-4 mr-2" />
                                  Reply
                                </ContextMenuItem>
                                <ContextMenuItem onClick={() => setShowAICopilot(true)}>
                                  <Sparkles className="w-4 h-4 mr-2" />
                                  AI Options
                                </ContextMenuItem>
                                <ContextMenuItem onClick={() => handleStarMessage(msg.id)}>
                                  <Star className={`w-4 h-4 mr-2 ${isStarred ? 'fill-yellow-400 text-yellow-400' : ''}`} />
                                  {isStarred ? 'Unstar' : 'Star'}
                                </ContextMenuItem>
                                <DropdownMenuSeparator />
                                <ContextMenuItem onClick={() => handleDeleteMessage(msg, false)}>
                                  <Trash2 className="w-4 h-4 mr-2" />
                                  Delete for me
                                </ContextMenuItem>
                                {isSent && (
                                  <ContextMenuItem className="text-red-600" onClick={() => handleDeleteMessage(msg, true)}>
                                    <Trash2 className="w-4 h-4 mr-2" />
                                    Delete for everyone
                                  </ContextMenuItem>
                                )}
                              </ContextMenuContent>
                            </ContextMenu>
                          </div>

                          <div className={`mt-1 flex items-center gap-1.5 px-1 opacity-0 group-hover/msg:opacity-100 transition-opacity duration-300 ${isSent ? 'justify-end' : 'justify-start'}`}>
                            <span className="text-[10px] font-medium text-muted-foreground uppercase opacity-60">
                              {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                            {isSent && <MessageStatusIcon status={msg.status} />}
                          </div>
                        </div>
                      </motion.div>
                    );
                  })}
                </AnimatePresence>
              </div>
            )}

            {isTyping && (
              <div className="flex justify-start items-center gap-2">
                <Avatar className="w-8 h-8 opacity-50">
                  <AvatarFallback className="text-[10px]">...</AvatarFallback>
                </Avatar>
                <div className="bg-secondary rounded-2xl px-4 py-2 text-[13px] text-muted-foreground italic">
                  Typing...
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        </ScrollArea>
      </div>

      {/* Input Area - Professional Standard */}
      {/* Input Area - Professional Standard */}
      <div className="px-4 py-4 border-t bg-background flex-shrink-0 z-10">
        <div className="max-w-4xl mx-auto">
          {selectedFiles.length > 0 && (
            <div className="flex items-center gap-2 mb-3 p-2 bg-muted rounded-lg overflow-x-auto">
              {selectedFiles.map((file, i) => (
                <FilePreview key={i} file={file} onRemove={() => removeFile(i)} />
              ))}
            </div>
          )}

          {replyToMessage && (
            <div className="flex items-center gap-3 mb-3 p-3 bg-muted/50 backdrop-blur-sm rounded-xl border-l-4 border-primary animate-in slide-in-from-bottom-2 duration-300">
              <div className="flex-1 min-w-0">
                <div className="text-[11px] font-bold text-primary uppercase tracking-wider mb-0.5">
                  Replying to {replyToMessage.senderId === currentUser.id ? 'yourself' : (participantProfiles[replyToMessage.senderId]?.name || recipientUser?.name || 'User')}
                </div>
                <div className="text-sm text-muted-foreground truncate italic">
                  {replyToMessage.type === 'text' ? replyToMessage.content : `[${replyToMessage.type}]`}
                </div>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="w-7 h-7 rounded-full hover:bg-muted"
                onClick={() => setReplyToMessage(null)}
              >
                <Plus className="w-4 h-4 rotate-45" />
              </Button>
            </div>
          )}

          <div className="flex items-end gap-2">
            <div className="flex items-center gap-1 mb-1">
              <Button
                variant="ghost"
                size="icon"
                className="w-9 h-9 text-muted-foreground hover:text-foreground"
                onClick={() => fileInputRef.current?.click()}
              >
                <Paperclip className="w-5 h-5" />
              </Button>
              <input
                type="file"
                ref={fileInputRef}
                className="hidden"
                multiple
                onChange={handleFileSelect}
              />
              <Popover open={emojiPickerOpen} onOpenChange={setEmojiPickerOpen}>
                <PopoverTrigger asChild>
                  <Button variant="ghost" size="icon" className="w-9 h-9 text-muted-foreground hover:text-foreground">
                    <Smile className="w-5 h-5" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="p-0 border shadow-xl" align="start">
                  <EmojiPicker onSelect={handleEmojiSelect} />
                </PopoverContent>
              </Popover>
            </div>

            <div className="flex-1 relative">
              <Textarea
                value={newMessage}
                onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setNewMessage(e.target.value)}
                onKeyDown={(e: React.KeyboardEvent<HTMLTextAreaElement>) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSendMessage(e as any);
                  }
                }}
                placeholder="Type your message..."
                className="w-full bg-[#f3f4f6] dark:bg-[#1e1e1e] border-transparent rounded-[24px] py-3.5 px-5 min-h-[50px] max-h-[150px] resize-none text-[15px] focus-visible:ring-1 focus-visible:ring-primary/20 transition-all"
                rows={1}
              />
            </div>

            <div className="flex items-center gap-2 mb-1">
              <Button
                onClick={(e: React.MouseEvent<HTMLButtonElement>) => handleSendMessage(e as any)}
                disabled={!newMessage.trim() && selectedFiles.length === 0}
                className="w-12 h-12 rounded-full bg-gradient-to-br from-[#6366f1] to-[#a855f7] text-white shadow-lg hover:opacity-90 transition-all flex items-center justify-center p-0 border-none flex-shrink-0"
              >
                {isSending ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-6 h-6" />}
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Overlays */}
      <AnimatePresence>
        {showMediaPanel && (
          <motion.div
            initial={{ x: '100%', opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: '100%', opacity: 0 }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed md:relative right-0 top-0 h-full w-full md:w-80 border-l bg-background z-50 shadow-2xl md:shadow-none"
          >
            <SharedMediaPanel
              conversationId={conversation.id}
              accessToken={accessToken}
              onClose={() => setShowMediaPanel(false)}
            />
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showAICopilot && (
          <motion.div
            initial={{ x: '100%', opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: '100%', opacity: 0 }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed md:relative right-0 top-0 h-full w-full md:w-96 border-l bg-background z-50 shadow-2xl md:shadow-none"
          >
            <AICopilotPanel
              open={showAICopilot}
              onOpenChange={setShowAICopilot}
              accessToken={accessToken || ''}
              currentUser={currentUser}
              messages={messages.map((m: any) => ({
                senderName: m.senderId === currentUser.id ? currentUser.name : (participantProfiles[m.senderId]?.name || recipientUser?.name || 'User'),
                content: m.content
              }))}
              onInsertText={(text) => setNewMessage(prev => prev + (prev ? ' ' : '') + text)}
            />
          </motion.div>
        )}
      </AnimatePresence>

      <ConversationTimeline
        open={showTimeline}
        onClose={() => setShowTimeline(false)}
        messages={messages}
        starredMessageIds={starredMessageIds}
        scheduledItems={scheduledItems}
        currentUser={currentUser}
        recipientUser={recipientUser}
        groupName={groupDetails?.name}
        onUnstar={handleUnstar}
      />

      <StudyModeConfigDialog
        open={configDialogOpen}
        onOpenChange={setConfigDialogOpen}
        mode={configMode}
        examSettings={examSettings}
        lectureSettings={lectureSettings}
        onSaveExam={(settings) => setExamSettings(settings)}
        onSaveLecture={(settings) => setLectureSettings(settings)}
      />

      <Dialog open={showMembersModal} onOpenChange={setShowMembersModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Community Members</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4 max-h-[60vh] overflow-y-auto">
            {globalRooms?.find((r: any) => r.id === conversation?.id)?.members?.map((member: any) => (
              <div key={member.id} className="flex items-center gap-3">
                <Avatar className="w-10 h-10 border">
                  {member.avatar && <AvatarImage src={member.avatar} />}
                  <AvatarFallback className="bg-muted text-muted-foreground font-semibold">
                    {getInitials(member.name)}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">{member.name}</p>
                </div>
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}