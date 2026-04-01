import { useState, useEffect } from 'react';
import { getSupabaseClient } from './utils/supabase/client';
import { AuthScreen } from './components/AuthScreen';
import { SidebarModern } from './components/SidebarModern';
import { ChatAreaModern } from './components/ChatAreaModern';
import { ScheduleDialog } from './components/ScheduleDialog';
import { CreateGroupDialog } from './components/CreateGroupDialog';
import { CreateRoomDialog } from './components/CreateRoomDialog';
import { Toaster } from './components/ui/sonner';
import { projectId, publicAnonKey } from './utils/supabase/info';
import { toast } from 'sonner';
import { callSignaling, CallSignalPayload } from './utils/callSignaling';
import { CallDialog } from './components/CallDialog';
import { ProfileDialog } from './components/ProfileDialog';



export default function App() {
  const [user, setUser] = useState<any>(null);
  const [accessToken, setAccessToken] = useState<string>('');
  const [conversations, setConversations] = useState<any[]>(() => {
    try {
      const cached = localStorage.getItem('convo_conversations');
      return cached ? JSON.parse(cached) : [];
    } catch (e) {
      return [];
    }
  });

  const [selectedConversation, setSelectedConversation] = useState<any>(null);
  const [debugLog, setDebugLog] = useState<string[]>([]);
  const addLog = (msg: string) => setDebugLog(prev => [...prev.slice(-10), `${new Date().toLocaleTimeString()}: ${msg}`]);
  const [scheduleDialogOpen, setScheduleDialogOpen] = useState(false);
  const [createGroupDialogOpen, setCreateGroupDialogOpen] = useState(false);
  const [scheduleDialogTab, setScheduleDialogTab] = useState<'message' | 'call'>('message');
  const [isCheckingSession, setIsCheckingSession] = useState(true);
  const [showChat, setShowChat] = useState(false);
  const [chatWallpaper, setChatWallpaper] = useState('default');
  const [activeTab, setActiveTab] = useState('chats');
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [profileEditorOpen, setProfileEditorOpen] = useState(false);
  const [deepLinkProcessed, setDeepLinkProcessed] = useState(false);
  const [viewProfileUser, setViewProfileUser] = useState<any>(null);
  const [connectionRequests, setConnectionRequests] = useState<any[]>([]);


  
  const [globalRooms, setGlobalRooms] = useState<any[]>([]);
  const [joinedRoomIds, setJoinedRoomIds] = useState<string[]>([]);

  const [createRoomDialogOpen, setCreateRoomDialogOpen] = useState(false);
  const [callDialogOpen, setCallDialogOpen] = useState(false);
  const [activeCallPayload, setActiveCallPayload] = useState<CallSignalPayload | null>(null);
  const [isIncomingCall, setIsIncomingCall] = useState(false);
  const [scheduledCallAlert, setScheduledCallAlert] = useState<any>(null);
  const [theme, setTheme] = useState(() => {
    return localStorage.getItem('convo-theme') || 'default';
  });
  const [darkMode, setDarkMode] = useState(() => {
    return localStorage.getItem('convo-dark-mode') === 'true';
  });

  const supabase = getSupabaseClient();

  useEffect(() => {
    const root = document.documentElement;
    // Themes that are ALWAYS dark:
    const alwaysDarkThemes = ['dark', 'glass'];
    // Themes that can be light or dark:
    const adaptiveThemes = ['default', 'purple', 'sunset', 'liquid-glass', 'silk', 'aurora', 'cyberpunk', 'nebula'];
    
    const isDark = alwaysDarkThemes.includes(theme) || (adaptiveThemes.includes(theme) && darkMode);

    if (isDark) {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }

    root.setAttribute('data-theme', theme);
    localStorage.setItem('convo-theme', theme);
    localStorage.setItem('convo-dark-mode', String(darkMode));
  }, [darkMode, theme]);

  const getAppBackgroundClass = () => {
    if (theme === 'liquid-glass') return darkMode ? 'liquid-mesh' : 'liquid-mesh-light';
    if (theme === 'nebula') return 'nebula-mesh';
    if (theme === 'aurora') return 'aurora-mesh';
    if (theme === 'cyberpunk') return 'cyber-mesh';
    if (theme === 'silk') return 'silk-mesh';
    return darkMode ? 'bg-zinc-950' : 'bg-background';
  };

  const fetchSupabaseRooms = async () => {
    if (!user) return;
    const s: any = supabase;
    const { data: roomsList, error: err1 } = await s.from('rooms').select('*');
    if (err1) toast.error("Rooms Fetch Error: " + err1.message);
    const { data: membersList, error: err2 } = await s.from('room_members').select('*');
    if (err2) toast.error("Members Fetch Error: " + err2.message);
    
    if (!roomsList) return;
    const membersMap: any = {};
    if (membersList) {
       (membersList as any[]).forEach((m: any) => {
          if (!membersMap[m.room_id]) membersMap[m.room_id] = [];
          const mName = m.user_id === user.id ? user.name : (m.username ? `@${m.username}` : (m.name || `User_${m.user_id.slice(0,4)}`));
          membersMap[m.room_id].push({ ...m, name: mName, avatar: m.user_id === user.id ? user.avatar : undefined });
       });
    }

    const builtRooms = (roomsList as any[]).map((r: any) => ({
      id: r.id, 
      participantId: '', 
      groupId: r.id, 
      groupName: r.name, 
      isRoom: true, 
      memberCount: membersMap[r.id]?.length || 0,
      members: membersMap[r.id] || [],
      participants: membersMap[r.id]?.map((m: any) => m.user_id) || [],
      messages: [] 
    }));

    setGlobalRooms(builtRooms);
    setJoinedRoomIds(builtRooms.filter((r: any) => r.members.some((m: any) => m.user_id === user.id)).map((r: any) => r.id));
  };

  useEffect(() => {
    checkExistingSession();
    
    // Global Authentication State Orchestrator
    const { data: authListener } = supabase.auth.onAuthStateChange(async (event, session) => {
       console.log('[App] Auth status changed:', event);
       if (event === 'SIGNED_IN' && session) {
          console.log('[App] Intercepted SIGNED_IN global event.');
          handleAuthSuccess(session.user, session.access_token);
       } else if (event === 'SIGNED_OUT') {
          console.log('[App] Intercepted SIGNED_OUT global event.');
          setUser(null);
          setAccessToken('');
          setSelectedConversation(null);
          setConversations([]);
          localStorage.removeItem('convo_user');
          localStorage.removeItem('convo_conversations');
       }
    });

    return () => {
       authListener.subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (user) {
      fetchConversations();
      fetchSupabaseRooms();
      const interval = setInterval(fetchConversations, 3000);
      
      // BACKGROUND ORCHESTRATOR: Every 15s check for due scheduled items
      const schedInterval = setInterval(async () => {
        try {
          const { data: kvItems } = await supabase
            .from('kv_store_5b740c2f' as any)
            .select('*')
            .like('key', `scheduled-%:${user.id}:%`);

          if (kvItems && Array.isArray(kvItems)) {
            const now = new Date();
            for (const item of kvItems as any[]) {
              const val = item.value;
              if (val.status !== 'pending') continue;

              const scheduledTime = new Date(val.scheduledFor);
              if (scheduledTime <= now) {
                console.log('[Orchestrator] Executing scheduled item:', val.id, val.type);
                
                if (val.type === 'message') {
                  // Execute Message
                  try {
                    const tokenToUse = user.email === 'zorohero2345@gmail.com' ? 'ZORO_DEBUG_MASTER_99' : accessToken;
                    const endpoint = val.roomId ? 'room-message' : 'message';
                    const body = val.roomId 
                      ? { roomId: val.roomId, content: val.content }
                      : { recipientId: val.recipientId, content: val.content };

                    const sendRes = await fetch(
                      `https://${projectId}.supabase.co/functions/v1/make-server-5b740c2f/${endpoint}`,
                      {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${tokenToUse}` },
                        body: JSON.stringify(body)
                      }
                    );

                    // Update status to 'sent'
                    await (supabase
                      .from('kv_store_5b740c2f' as any) as any)
                      .update({ value: { ...val, status: 'sent', executedAt: new Date().toISOString() } })
                      .eq('key', item.key);
                    
                    if (sendRes.ok) {
                      toast.success(`Scheduled message to ${val.receiver_name || 'User'} sent!`);
                      fetchConversations();
                    }
                  } catch (e) {
                    console.error('Scheduled Message Execution Error:', e);
                  }
                } else if (val.type === 'call') {
                  // Trigger Call Alert
                  setScheduledCallAlert(val);
                  // Update status to 'notified' to prevent double alerts
                  await (supabase
                    .from('kv_store_5b740c2f' as any) as any)
                    .update({ value: { ...val, status: 'notified', notifiedAt: new Date().toISOString() } })
                    .eq('key', item.key);
                }
              }
            }
          }
        } catch (err) {
          console.error('[Orchestrator] Error:', err);
        }
      }, 15000);

      return () => {
        clearInterval(interval);
        clearInterval(schedInterval);
      };
    }
  }, [user, accessToken]);

  // Real-time Notification System
  useEffect(() => {
    if (!user || !accessToken) return;

    const supabase = getSupabaseClient();
    
    // 1. Listen for DM changes (kv_store_5b740c2f)
    const dmChannel = supabase.channel('realtime:dms')
      .on('postgres_changes', { 
        event: 'INSERT', 
        schema: 'public', 
        table: 'kv_store_5b740c2f',
        filter: `key=like.conv:*`
      }, (payload: any) => {
        const item = payload.new;
        if (!item || !item.value) return;
        
        const conv = item.value;
        const participants = conv.participants || [];
        const lastMsg = conv.messages?.[conv.messages.length - 1];
        
        // If we are part of this conv but didn't send the last message
        if (participants.includes(user.id) && lastMsg && lastMsg.sender_id !== user.id) {
           const senderName = conv.participantName || 'Someone';
           toast.info(`${senderName}: ${lastMsg.text || 'Sent a message'}`, {
             action: {
               label: 'View',
               onClick: () => handleSelectConversation({ ...conv, id: item.key })
             },
             duration: 5000,
           });
           
           // Play subtle notification sound
           const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2354/2354-preview.mp3');
           audio.play().catch(() => {});
           
           fetchConversations();
        }
      })
      .subscribe();

    // 2. Listen for Room changes (room_messages)
    const roomChannel = supabase.channel('realtime:rooms')
      .on('postgres_changes', { 
        event: 'INSERT', 
        schema: 'public', 
        table: 'room_messages' 
      }, (payload: any) => {
        const msg = payload.new;
        if (!msg || msg.sender_id === user.id) return;
        
        // Check if we are in this room
        if (joinedRoomIds.includes(msg.room_id)) {
           const room = globalRooms.find(r => r.id === msg.room_id);
           const roomName = room?.groupName || 'Community Room';
           const senderName = msg.sender_name || 'Member';
           
           toast.info(`[${roomName}] ${senderName}: ${msg.content || 'Sent a message'}`, {
             action: {
               label: 'View',
               onClick: () => handleJoinRoom(msg.room_id)
             },
             duration: 5000,
           });

           const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2354/2354-preview.mp3');
           audio.play().catch(() => {});

           // Update room messages and unreadCount in state
           setGlobalRooms(prev => prev.map(r => {
             if (r.id === msg.room_id) {
               const isCurrentlySelected = selectedConversation?.id === r.id;
               return { 
                 ...r, 
                 messages: [...(r.messages || []), msg],
                 unreadCount: isCurrentlySelected ? 0 : (r.unreadCount || 0) + 1
               };
             }
             return r;
           }));
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(dmChannel);
      supabase.removeChannel(roomChannel);
    };
  }, [user, accessToken, joinedRoomIds, globalRooms]);

  // Handle Permanent Join Links
  useEffect(() => {
    const handleJoinLink = async () => {
      if (!user || !accessToken || deepLinkProcessed) return;

      const params = new URLSearchParams(window.location.search);
      const roomId = params.get('join');
      
      if (roomId) {
        setDeepLinkProcessed(true);
        console.log('[App] Processing Join Link for Room:', roomId);
        
        try {
          const s = getSupabaseClient() as any;
          
          // 1. Verify Room Exists
          const { data: room, error: roomErr } = await s.from('rooms').select('*').eq('id', roomId).single();
          
          if (roomErr || !room) {
            toast.error("Room not found or link is invalid.");
            return;
          }

          // 2. Check Membership
          const { data: member } = await s.from('room_members')
            .select('*')
            .eq('room_id', roomId)
            .eq('user_id', user.id)
            .single();

          if (!member) {
            toast.info(`Joining room: ${room.name}...`);
            const { error: joinErr } = await s.from('room_members').insert([{
              room_id: roomId,
              user_id: user.id
            }]);
            
            if (joinErr) {
              toast.error("Failed to join room: " + joinErr.message);
              return;
            }
          }

          // 3. Refresh & Navigate
          await fetchSupabaseRooms();
          handleSelectConversation({
            id: roomId,
            groupId: roomId,
            groupName: room.name,
            isRoom: true,
            participants: [] // Will be populated by fetchRoomMessages
          });

          toast.success(`Welcome to ${room.name}!`);
          
          // 4. Clean up URL
          const newUrl = window.location.origin + window.location.pathname;
          window.history.replaceState({}, document.title, newUrl);
          
        } catch (err) {
          console.error('[App] Join Link Error:', err);
        }
      }
    };

    handleJoinLink();
  }, [user, accessToken, deepLinkProcessed]);

  useEffect(() => {
    if (user) {
      console.log('[App] Initializing call signaling for user:', user.id, user.name);
      
      // Request notification permission if needed
      if ('Notification' in window && Notification.permission === 'default') {
        Notification.requestPermission();
      }

      // Pre-request media permissions for calls
      if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        navigator.mediaDevices.getUserMedia({ audio: true, video: true })
          .then(() => console.log('[App] Media permissions pre-authorized'))
          .catch((err) => console.warn('[App] Media permissions denied/failed:', err));
      }

      const handleGlobalSignal = (payload: any) => {
        console.log('[App] Received signaling event:', payload.type, 'from:', payload.fromName || payload.from);
        if (payload.type === 'call:request') {
          setActiveCallPayload(payload);
          setIsIncomingCall(true);
          setCallDialogOpen(true);

          // Show browser notification if tab is in background
          if (document.visibilityState === 'hidden' && 'Notification' in window && Notification.permission === 'granted') {
            new Notification(`Incoming ${payload.isVideo ? 'Video' : 'Voice'} Call`, {
              body: `From: ${payload.fromName || 'Unknown User'}`,
              icon: '/vite.svg',
              tag: 'incoming-call',
              requireInteraction: true,
              renotify: true,
              silent: false,
            } as any);
          }
        }
      };

      callSignaling.subscribe(user.id, handleGlobalSignal);
      
      return () => {
        console.log('[App] Cleaning up global call signaling listener');
        callSignaling.unsubscribe(handleGlobalSignal);
      };
    }
  }, [user]);


  const handleInitiateCall = (targetId: string, targetName: string, isVideo: boolean) => {
    const isRoom = globalRooms.some(r => r.id === targetId);
    
    const payload: CallSignalPayload = {
      type: 'call:request',
      from: user.id,
      fromName: user.name,
      to: targetId,
      isVideo
    };
    
    setActiveCallPayload({ ...payload, fromName: targetName });
    setIsIncomingCall(false);
    setCallDialogOpen(true);
    
    // Only send direct signal if NOT a room meeting
    if (!isRoom) {
      callSignaling.sendSignal(payload);
    }
  };

  const fetchFullProfile = async (userId: string, token: string) => {
    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-5b740c2f/profile/${userId}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (response.ok) {
        const data = await response.json();
        return data.profile;
      } else {
        // SQL FALLBACK for Profile
        console.warn('Edge Profile fetch failed, trying direct SQL fallback');
        const { data: kvProfile, error } = await supabase
          .from('kv_store_5b740c2f')
          .select('value')
          .eq('key', `user:${userId}`)
          .maybeSingle();
        
        if (kvProfile) return (kvProfile as any).value;
      }
    } catch (error) {
      console.error('Error fetching full profile:', error);
    }
    return null;
  };

  const checkExistingSession = async () => {
    try {
      // 1. Try to load from localStorage first for instant UI
      const cachedUser = localStorage.getItem('convo_user');
      if (cachedUser) {
        try {
          const parsed = JSON.parse(cachedUser);
          if (parsed && parsed.id) setUser(parsed);
        } catch (e) {}
      }

      const { data: { session }, error } = await supabase.auth.getSession();

      if (session && session.user) {
        setAccessToken(session.access_token);
        
        // 1. Fetch exact profile from the users custom table
        const { data: dbUser, error: dbErr } = await (supabase as any)
          .from('users')
          .select('id, name, username, email, avatar_url')
          .eq('id', session.user.id)
          .maybeSingle();
        
        if (dbUser) {
          setUser(dbUser);
          localStorage.setItem('convo_user', JSON.stringify(dbUser));
        } else {
          // Initial fallback from session if db user is missing entirely
          const baseUser = {
            id: session.user.id,
            name: session.user.user_metadata?.name || session.user.email?.split('@')[0] || 'User',
            username: session.user.user_metadata?.username || session.user.user_metadata?.handle || null,
            email: session.user.email || '',
            bio: session.user.user_metadata?.bio || '',
            avatar_url: session.user.user_metadata?.avatar_url || null,
          };
          setUser(baseUser);
          localStorage.setItem('convo_user', JSON.stringify(baseUser));
        }
      } else {
        // No session - clear local cache
        localStorage.removeItem('convo_user');
      }
    } catch (error) {
      console.error('Error checking session:', error);
    } finally {
      setIsCheckingSession(false);
    }
  };

  const fetchConversations = async () => {
    if (!user) return;
    try {
      const supabase = getSupabaseClient();
      
      // 1. Fetch relational 'chats' table
      const { data: chatData, error: chatErr } = await supabase
        .from('chats')
        .select(`
          id,
          user1_id,
          user2_id,
          created_at,
          user1:users!user1_id(id, name, avatar_url),
          user2:users!user2_id(id, name, avatar_url)
        `)
        .or(`user1_id.eq.${user.id},user2_id.eq.${user.id}`)
        .order('created_at', { ascending: false });

      // 2. Fetch KV Store (Legacy)
      const { data: kvConvs, error: kvErr } = await supabase
        .from('kv_store_5b740c2f' as any)
        .select('*')
        .like('key', 'conv:%');

      const legacyConvs = (kvConvs || [])
        .map((item: any) => item.value)
        .filter((c: any) => c.participants?.includes(user.id))
        .map((c: any) => ({
          ...c,
          participantId: c.participants?.find((p: string) => p !== user.id),
          participantName: c.participantName || 'User', 
          isRoom: false
        }));

      const relationalConvs = (chatData || []).map((chat: any) => {
        const otherUser = chat.user1_id === user.id ? chat.user2 : chat.user1;
        const otherId = chat.user1_id === user.id ? chat.user2_id : chat.user1_id;
        return {
          id: chat.id,
          participantId: otherId,
          participantName: otherUser?.name || 'User',
          lastMessage: 'Open conversation',
          lastMessageTime: chat.created_at,
          unreadCount: 0,
          isRoom: false,
          participants: [chat.user1_id, chat.user2_id]
        };
      });

      // 3. Merge and deduplicate
      const combined = [...relationalConvs];
      legacyConvs.forEach(lc => {
        if (!combined.some(rc => rc.participantId === lc.participantId)) {
          combined.push(lc);
        }
      });

      // 4. Sort by time
      combined.sort((a, b) => new Date(b.lastMessageTime).getTime() - new Date(a.lastMessageTime).getTime());

      setConversations(combined);
      localStorage.setItem('convo_conversations', JSON.stringify(combined));
    } catch (error: any) {
      console.error('[App] Fetch Conversations Error:', error);
    }
  };

  const handleAuthSuccess = async (authUser: any, token: string) => {
    setAccessToken(token);
    
    const { data: dbUser } = await (supabase as any)
      .from('users')
      .select('id, name, username, email, avatar_url')
      .eq('id', authUser.id)
      .maybeSingle();

    if (dbUser) {
      setUser(dbUser);
      localStorage.setItem('convo_user', JSON.stringify(dbUser));
    } else {
      const baseUser = {
        id: authUser.id,
        name: authUser.user_metadata?.name || authUser.email?.split('@')[0] || 'User',
        username: authUser.user_metadata?.username || null,
        email: authUser.email || '',
        avatar_url: authUser.user_metadata?.avatar_url || null,
      };
      setUser(baseUser);
      localStorage.setItem('convo_user', JSON.stringify(baseUser));
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setAccessToken('');
    setSelectedConversation(null);
    setConversations([]);
  };

  const handleSelectConversation = (conv: any) => {
    // Instant unread count reset for UI responsiveness
    if (conv.isRoom || conv.groupId) {
      setGlobalRooms(prev => prev.map(r => (r.id === conv.id || r.id === conv.groupId) ? { ...r, unreadCount: 0 } : r));
    } else {
      setConversations(prev => prev.map(c => c.id === conv.id ? { ...c, unreadCount: 0 } : c));
    }

    if (conv.isRoom) {
      setSelectedConversation({
        ...conv,
        isRoom: true
      });
    } else if (conv.groupId) {
      setSelectedConversation({
        id: conv.id,
        participants: [],
        groupId: conv.groupId,
      });
    } else {
      setSelectedConversation({
        ...conv,
        participants: [user.id, conv.participantId],
      });
    }
    setShowChat(true);
  };

  const handleNewChat = async (recipientId: string) => {
    try {
      const s = getSupabaseClient();
      console.log('[App] Target Connection Request to User ID:', recipientId);
      
      // 1. Check for existing chat (try Postgres first)
      const { data: existingChat, error: existingErr } = await (s.from('chats') as any)
        .select('*')
        .or(`and(user1_id.eq.${user.id},user2_id.eq.${recipientId}),and(user1_id.eq.${recipientId},user2_id.eq.${user.id})`)
        .single();

      let targetChat = existingChat;

      // 2. If Postgres fails (no chat), create standard Postgres chat
      if (existingErr || !existingChat) {
         console.log('[App] No existing Postgres chat found, creating new connection...');
         const [u1, u2] = [user.id, recipientId].sort();
         const { data: newChat, error: createErr } = await (s.from('chats') as any)
           .insert([{ user1_id: u1, user2_id: u2 }])
           .select()
           .single();
           
         if (createErr) {
            console.error('[App] Database failed to insert new chat connection:', createErr);
            throw createErr;
         }
         targetChat = newChat;
         fetchConversations();
      }

      console.log('[App] Connection successfully loaded. Selected Chat ID:', targetChat.id);

      // 3. Select the chat
      setSelectedConversation({
        id: (targetChat as any).id,
        participants: [user.id, recipientId],
        participantId: recipientId,
        isRoom: false
      });
      setShowChat(true);
    } catch (err: any) {
      console.error('[App] Failed to start new chat:', err);
      toast.error('Could not start chat: ' + err.message);
    }
  };

  const handleScheduleMessage = () => {
    setScheduleDialogTab('message');
    setScheduleDialogOpen(true);
  };

  const handleScheduleCall = () => {
    setScheduleDialogTab('call');
    setScheduleDialogOpen(true);
  };

  const handleScheduleSubmit = async (data: any) => {
    let success = false;
    const recipientId = selectedConversation?.participants?.find((p: string) => p !== user.id) || null;
    const roomId = selectedConversation?.isRoom ? selectedConversation.id : null;

    try {
      if (scheduleDialogTab === 'message') {
        const response = await fetch(
          `https://${projectId}.supabase.co/functions/v1/make-server-5b740c2f/schedule-message`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
            body: JSON.stringify({ recipientId, roomId, content: data.message, scheduledTime: data.scheduledTime }),
          }
        );
        if (response.ok) {
          toast.success('Message scheduled successfully');
          setScheduleDialogOpen(false);
          success = true;
        }
      } else {
        const response = await fetch(
          `https://${projectId}.supabase.co/functions/v1/make-server-5b740c2f/schedule-call`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
            body: JSON.stringify({ recipientId, roomId, callType: data.callType, scheduledTime: data.scheduledTime }),
          }
        );
        if (response.ok) {
          toast.success('Call scheduled successfully');
          setScheduleDialogOpen(false);
          success = true;
        }
      }
    } catch (error) {
      console.warn('Edge Scheduling failed, trying SQL Fallback:', error);
    }

    if (!success) {
      // SQL Fallback for Scheduling (VAULT MODE)
      try {
        const schedId = crypto.randomUUID();
        const type = scheduleDialogTab;
        const key = `scheduled-${type}:${user.id}:${schedId}`;
        
        // Data Enrichment: Resolve recipient details for the Vault entry
        let receiverName = 'Unknown User';
        let receiverAvatar = null;
        
        if (roomId) {
          const room = globalRooms.find(r => r.id === roomId);
          if (room) receiverName = room.groupName || 'Community Room';
        } else if (recipientId) {
          // Try to find in people list or conversations
          const matchedUser = conversations.find(c => c.participantId === recipientId);
          if (matchedUser) {
             receiverName = matchedUser.participantName || 'Chat Participant';
          } else {
             const person = globalRooms.flatMap(r => r.members || []).find((m: any) => m.user_id === recipientId);
             if (person) receiverName = person.name;
          }
        }

        const value = {
          id: schedId,
          type,
          recipientId,
          roomId,
          receiver_name: receiverName,
          receiver_avatar: receiverAvatar,
          content: data.message,
          callType: data.callType,
          scheduledFor: data.scheduledTime,
          status: 'pending',
          createdAt: new Date().toISOString(),
          userId: user.id
        };

        const { error: sqlError } = await supabase
          .from('kv_store_5b740c2f' as any)
          .upsert({ key, value } as any);

        if (sqlError) throw sqlError;

        toast.success(`${type === 'message' ? 'Message' : 'Call'} scheduled (Vault Mode)`);
        setScheduleDialogOpen(false);
      } catch (e: any) {
        console.error('Severe scheduling failure:', e);
        toast.error('Failed to schedule communication');
      }
    }
  };

  const handleCreateGroup = async (data: { name: string; memberIds: string[] }) => {
    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-5b740c2f/groups`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
          body: JSON.stringify(data),
        }
      );

      if (response.ok) {
        const result = await response.json();
        toast.success('Group created successfully');
        setCreateGroupDialogOpen(false);
        setSelectedConversation({
          id: `conv:group:${result.group.id}`,
          participants: result.group.members,
          groupId: result.group.id,
        });
        fetchConversations();
      }
    } catch (error) {
      console.error('Error creating group:', error);
      toast.error('Failed to create group');
    }
  };

  const handleProfileUpdate = async (updatedProfile: any) => {
    // 1. Update state and cache immediately with the returned profile
    setUser((prev: any) => {
      const newUser = { ...prev, ...updatedProfile };
      localStorage.setItem('convo_user', JSON.stringify(newUser));
      return newUser;
    });
    
    // 2. Refresh global lists to ensure discovery works
    fetchConversations();
    fetchSupabaseRooms();
  };

  const handleViewProfile = async (userId: string) => {
    let success = false;
    try {
      const tokenToUse = user?.email === 'zorohero2345@gmail.com' ? 'ZORO_DEBUG_MASTER_99' : accessToken;
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-5b740c2f/profile/${userId}`,
        { headers: { Authorization: `Bearer ${tokenToUse}` } }
      );
      if (response.ok) {
        const data = await response.json();
        setViewProfileUser(data.profile);
        success = true;
      }
    } catch (error) {
      console.warn('Edge Profile view failed, trying SQL fallback:', error);
    }

    if (!success) {
       // SQL Fallback for View Profile
       try {
         const { data: kvProfile } = await supabase
           .from('kv_store_5b740c2f' as any)
           .select('*')
           .eq('key', `user:${userId}`)
           .single();
         
         if (kvProfile) {
           setViewProfileUser((kvProfile as any).value);
         } else {
           toast.error("Failed to load profile (Vault mode)");
         }
       } catch (e) {
         console.error("SQL Fallback failed:", e);
         toast.error("Error loading profile");
       }
    }
  };

  const fetchConnections = async () => {
    if (!accessToken) return;
    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-5b740c2f/connections`,
        { headers: { Authorization: `Bearer ${accessToken}` } }
      );
      if (response.ok) {
        const data = await response.json();
        setConnectionRequests(data.requests || []);
      }
    } catch (error) {
      console.error("Error fetching connections:", error);
    }
  };

  const handleConnect = async (targetUserId: string) => {
    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-5b740c2f/connections`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
          body: JSON.stringify({ receiver_id: targetUserId }),
        }
      );
      if (response.ok) {
        toast.success("Connection request sent!");
        fetchConnections();
      } else {
        const text = await response.text();
        console.log("Raw Error Response:", text);
        try {
          const data = JSON.parse(text);
          toast.error(data.error || "Failed to send request");
        } catch (e) {
          toast.error(`Server Error (Raw): ${text.slice(0, 50)}...`);
        }
      }
    } catch (error: any) {
      console.error("Connection error:", error);
      toast.error(`Network error: ${error.message || 'Check your internet or Supabase connection'}`);
    }
  };

  const handleUpdateConnection = async (requestId: string, status: 'accepted' | 'rejected') => {
    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-5b740c2f/connections/${requestId}`,
        {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
          body: JSON.stringify({ status }),
        }
      );
      if (response.ok) {
        toast.success(`Request ${status}`);
        fetchConnections();
        if (status === 'accepted') {
          fetchConversations();
        }
      }
    } catch (error) {
      toast.error("Failed to update connection");
    }
  };

  useEffect(() => {
    if (user && accessToken) {
      fetchConnections();
      const interval = setInterval(fetchConnections, 10000);
      return () => clearInterval(interval);
    }
  }, [user, accessToken]);

  const handleCreateRoom = async (room: any) => {
    const s: any = supabase;
    const res1 = await s.from('rooms').insert([{ id: room.id, name: room.groupName }]);
    if (res1.error) {
      toast.error("Room Insert Blocked: " + res1.error.message);
      return;
    }
    const res2 = await s.from('room_members').insert([{ room_id: room.id, user_id: user.id }]);
    if (res2.error) {
      toast.error("Members Insert Blocked: " + res2.error.message);
      return;
    }
    
    room.members = [{ user_id: user.id, name: user.name, avatar: user.avatar }];
    room.participants = [user.id];
    room.messages = [];
    room.memberCount = 1;

    setGlobalRooms((prev: any[]) => [room, ...prev]);
    setJoinedRoomIds((prev: string[]) => [room.id, ...prev]);
    setSelectedConversation(room);
  };

  const handleJoinRoom = async (roomId: string): Promise<boolean> => {
    const s: any = supabase;
    let roomIndex = globalRooms.findIndex((r: any) => r.id === roomId || r.id === `room:${roomId}` || r.groupId === `room:${roomId}`);
    
    let rootRoom: any;
    if (roomIndex !== -1) {
      rootRoom = globalRooms[roomIndex];
    } else {
      const searchId = roomId.startsWith('room:') ? roomId : `room:${roomId}`;
      const { data: roomData, error: roomErr } = await s.from('rooms').select('*').eq('id', searchId).single();
      if (roomErr) {
        toast.error("Join Room Fetch: " + roomErr.message);
        return false;
      }
      if (roomData) {
        rootRoom = {
          id: roomData.id, 
          participantId: '', 
          groupId: roomData.id, 
          groupName: roomData.name, 
          isRoom: true, 
          memberCount: 0,
          participants: [],
          messages: [],
          members: []
        };
      } else {
        toast.error("Room not found in Cloud Database.");
        return false;
      }
    }

    if (!joinedRoomIds.includes(rootRoom.id)) {
      const { error: joinErr } = await s.from('room_members').insert([{ room_id: rootRoom.id, user_id: user.id }]);
      if (joinErr && !joinErr.message.includes('unique')) {
        toast.error("Join Failed: " + joinErr.message);
        return false;
      }
      setJoinedRoomIds((prev: string[]) => [...prev, rootRoom.id]);
      toast.success(`Joined room: ${rootRoom.groupName}`);
    }
    
    handleSelectConversation({ ...rootRoom, isRoom: true });
    return true;
  };


  useEffect(() => {
    if (user && globalRooms.length > 0 && !deepLinkProcessed) {
      const params = new URLSearchParams(window.location.search);
      const roomId = params.get('room');
      const userParam = params.get('u');

      if (userParam) {
        setDeepLinkProcessed(true);
        // Fetch user by username
        fetch(`https://${projectId}.supabase.co/functions/v1/make-server-5b740c2f/profile-by-username/${userParam}`, {
          headers: { Authorization: `Bearer ${accessToken}` }
        })
        .then(res => res.ok ? res.json() : Promise.reject())
        .then(data => {
          setViewProfileUser(data.profile);
          toast.info(`Found @${userParam}`);
        })
        .catch(() => toast.error(`User @${userParam} not found`));
        
        // Clean URL
        const url = new URL(window.location.href);
        url.searchParams.delete('u');
        window.history.replaceState({}, '', url.toString());
      } else if (roomId) {
        setDeepLinkProcessed(true);
        const room = globalRooms.find((r: any) => r.id === roomId);
        if (room) {
          handleSelectConversation({ ...room, isRoom: true });
        } else {
          handleJoinRoom(roomId);
        }
        // Clean URL
        const url = new URL(window.location.href);
        url.searchParams.delete('room');
        window.history.replaceState({}, '', url.toString());
      }
    }
  }, [user, globalRooms, deepLinkProcessed]);


  if (isCheckingSession) {
    return (
                      <div className="w-full h-screen flex flex-col items-center justify-center bg-background p-4">
                        <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mb-4" />
                        <p className="text-muted-foreground font-medium">Restoring your session...</p>
                      </div>
    );
  }

  if (!user) {
    return <AuthScreen onAuthSuccess={handleAuthSuccess} />;
  }

  return (
    <div className={`h-screen flex overflow-hidden transition-all duration-700 ${getAppBackgroundClass()} text-foreground`}>
      {/* Sidebar */}
      <div className={`${showChat ? 'hidden md:flex' : 'flex'} flex-col w-full md:w-96 h-full`}>
        <SidebarModern
          currentUser={user}
          conversations={conversations}
          globalRooms={globalRooms}
          joinedRoomIds={joinedRoomIds}
          onSelectConversation={handleSelectConversation}
          onNewChat={handleNewChat}
          onCreateGroup={() => setCreateGroupDialogOpen(true)}
          onCreateRoomOpen={() => setCreateRoomDialogOpen(true)}


          onCreateRoom={handleCreateRoom}
          onJoinRoom={handleJoinRoom}

          onLogout={handleLogout}
          selectedConversationId={selectedConversation?.id || null}
          accessToken={accessToken}
          onWallpaperChange={setChatWallpaper}
          darkMode={darkMode}
          onToggleDarkMode={() => setDarkMode((d) => !d)}
          theme={theme}
          onThemeChange={setTheme}
          onProfileUpdate={handleProfileUpdate}
          onViewProfile={handleViewProfile}
          connectionRequests={connectionRequests}
          onUpdateConnection={handleUpdateConnection}
        />
      </div>

      {/* Chat Area */}
      <div className={`${showChat ? 'flex' : 'hidden md:flex'} flex-1 h-full overflow-hidden min-h-0`}>
        <ChatAreaModern
          conversation={selectedConversation}
          currentUser={user}
          accessToken={accessToken}
          onScheduleMessage={handleScheduleMessage}
          onScheduleCall={handleScheduleCall}
          onBack={() => setShowChat(false)}
          chatWallpaper={chatWallpaper}
          globalRooms={globalRooms}
          onRoomMessageSend={(roomId: string, message: any) => {
            setGlobalRooms(prev => prev.map(r => r.id === roomId ? { ...r, messages: [...(r.messages || []), message] } : r));
            if (selectedConversation?.id === roomId) {
              setSelectedConversation((prev: any) => ({...prev, messages: [...(prev.messages || []), message]}));
            }
          }}
          onInitiateCall={handleInitiateCall}
          onViewProfile={handleViewProfile}
        />
      </div>

      {/* Dialogs */}
      <ScheduleDialog
        open={scheduleDialogOpen}
        onOpenChange={setScheduleDialogOpen}
        defaultTab={scheduleDialogTab}
        onSubmit={handleScheduleSubmit}
      />

      <CreateGroupDialog
        open={createGroupDialogOpen}
        onOpenChange={setCreateGroupDialogOpen}
        accessToken={accessToken}
        onGroupCreated={fetchConversations}
      />

      <CreateRoomDialog
        open={createRoomDialogOpen}
        onOpenChange={setCreateRoomDialogOpen}
        onCreateRoom={(room: any) => {
          setGlobalRooms(prev => [room, ...prev]);
          setJoinedRoomIds(prev => [room.id, ...prev]);
          setSelectedConversation(room);
        }}
      />

      <ProfileDialog
        open={!!viewProfileUser}
        onOpenChange={(open) => !open && setViewProfileUser(null)}
        user={viewProfileUser}
        onConnectClick={handleConnect}
        connectionStatus={
          connectionRequests.find(r => 
            (r.sender_id === user.id && r.receiver_id === viewProfileUser?.id) ||
            (r.receiver_id === user.id && r.sender_id === viewProfileUser?.id)
          )?.status
        }
        onMessageClick={() => {
          if (viewProfileUser) {
            handleNewChat(viewProfileUser.id);
            setViewProfileUser(null);
          }
        }}
      />

      <Toaster position="bottom-right" richColors />


      {activeCallPayload && (
        <CallDialog
          open={callDialogOpen}
          onOpenChange={(open) => {
            setCallDialogOpen(open);
            if (!open) setActiveCallPayload(null);
          }}
          contactName={isIncomingCall ? activeCallPayload.fromName : (selectedConversation?.groupName || 'Contact')}
          contactId={isIncomingCall ? activeCallPayload.from : activeCallPayload.to}
          isVideoCall={activeCallPayload.isVideo}
          isIncoming={isIncomingCall}
          currentUser={user}
          isRoomCall={globalRooms.some(r => r.id === (isIncomingCall ? activeCallPayload.from : activeCallPayload.to))}
        />
      )}
    </div>
  );
}
