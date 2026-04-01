import { useState, useEffect } from 'react';
import { Avatar, AvatarFallback } from './ui/avatar';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { ScrollArea } from './ui/scroll-area';
import { Badge } from './ui/badge';
import { 
  Search, 
  MessageSquare, 
  Users, 
  Calendar, 
  LogOut,
  UserPlus,
} from 'lucide-react';
import { projectId, publicAnonKey } from '../utils/supabase/info';
import { getSupabaseClient } from '../utils/supabase/client';
import { toast } from 'sonner';

interface Conversation {
  id: string;
  participantId?: string;
  groupId?: string;
  lastMessage: string;
  lastMessageTime: string;
  unreadCount: number;
}

interface User {
  id: string;
  email: string;
  name: string;
}

interface ChatSidebarProps {
  currentUser: any;
  accessToken: string;
  onConversationSelect: (conversation: Conversation) => void;
  onNewChat: () => void;
  onScheduledClick: () => void;
  onLogout: () => void;
  selectedConversationId?: string;
}

export function ChatSidebar({ 
  currentUser, 
  accessToken, 
  onConversationSelect,
  onNewChat,
  onScheduledClick,
  onLogout,
  selectedConversationId,
}: ChatSidebarProps) {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [users, setUsers] = useState<Map<string, User>>(new Map());
  const [groups, setGroups] = useState<Map<string, any>>(new Map());
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'chats' | 'contacts'>('chats');

  useEffect(() => {
    fetchConversations();
    fetchUsers();
    
    // Poll for new conversations every 3 seconds
    const interval = setInterval(() => {
      fetchConversations();
    }, 3000);
    
    return () => clearInterval(interval);
  }, []);

  const fetchConversations = async () => {
    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-5b740c2f/conversations`,
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
          },
        }
      );

      if (response.ok) {
        const data = await response.json();
        setConversations(data.conversations || []);
      } else if (conversations.length === 0) {
        // FALLBACK: If Edge Function fails, fetch Rooms directly from SQL
        console.warn('Edge Function failed, falling back to direct SQL for Rooms');
        const supabase = getSupabaseClient();
        const { data: rooms, error } = await supabase.from('rooms').select('*');
        
        if (rooms) {
          const mappedRooms = (rooms as any[]).map(r => ({
            id: r.id,
            groupId: r.id.startsWith('room:') ? r.id : undefined,
            lastMessage: 'Cloud Server Offline (fallback mode)',
            lastMessageTime: r.created_at,
            unreadCount: 0,
            isRoom: true,
            name: r.name
          }));
          setConversations(mappedRooms);
        }
      }
    } catch (error) {
      console.error('Error fetching conversations:', error);
    }
  };

  const fetchUsers = async () => {
    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-5b740c2f/users`,
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
          },
        }
      );

      if (!response.ok) {
        console.error('Failed to fetch users');
        return;
      }

      const data = await response.json();
      const userMap = new Map();
      (data.users || []).forEach((user: User) => {
        userMap.set(user.id, user);
      });
      setUsers(userMap);
    } catch (error) {
      console.error('Error fetching users:', error);
    }
  };

  const fetchGroupDetails = async (groupId: string) => {
    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-5b740c2f/groups/${groupId}`,
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
          },
        }
      );

      if (response.ok) {
        const data = await response.json();
        setGroups(prev => new Map(prev).set(groupId, data.group));
      } else if (groupId.startsWith('room:')) {
        // Fallback for rooms
        const supabase = getSupabaseClient();
        const { data: room } = await supabase.from('rooms').select('*').eq('id', groupId).single();
        if (room) {
          setGroups(prev => new Map(prev).set(groupId, room));
        }
      }
    } catch (error) {
      console.error('Error fetching group details:', error);
    }
  };

  const getConversationName = (conv: Conversation) => {
    if (conv.groupId) {
      const group = groups.get(conv.groupId);
      return group?.name || 'Group Chat';
    }
    const user = users.get(conv.participantId || '');
    return user?.name || user?.email || 'Unknown';
  };

  const getConversationInitials = (conv: Conversation) => {
    const name = getConversationName(conv);
    return name.split(' ').map((n: any) => n[0]).join('').toUpperCase().slice(0, 2);
  };

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);

    if (diffInHours < 24) {
      return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
    }
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const startNewChat = (userId: string) => {
    const user = users.get(userId);
    if (!user) return;

    // Create a temporary conversation object
    const newConversation: Conversation = {
      id: [currentUser.id, userId].sort().join(':'),
      participantId: userId,
      lastMessage: '',
      lastMessageTime: new Date().toISOString(),
      unreadCount: 0,
    };

    onConversationSelect(newConversation);
    setActiveTab('chats');
  };

  const filteredConversations = conversations.filter(conv =>
    getConversationName(conv).toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredUsers = Array.from(users.values()).filter(user =>
    user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    user.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="w-80 border-r flex flex-col bg-gradient-to-b from-gray-50 to-white">
      {/* Header */}
      <div className="p-4 border-b bg-white/80 backdrop-blur-sm">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center">
              <MessageSquare className="w-5 h-5 text-white" />
            </div>
            <h2 className="text-xl">Convo</h2>
          </div>
          <Button variant="ghost" size="icon" onClick={onLogout} className="hover:bg-red-50 hover:text-red-600">
            <LogOut className="w-5 h-5" />
          </Button>
        </div>
        
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input
            placeholder="Search..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b">
        <button
          onClick={() => setActiveTab('chats')}
          className={`flex-1 py-3 flex items-center justify-center gap-2 transition-colors ${
            activeTab === 'chats' ? 'border-b-2 border-blue-500 text-blue-600' : 'text-gray-600'
          }`}
        >
          <MessageSquare className="w-4 h-4" />
          Chats
        </button>
        <button
          onClick={() => setActiveTab('contacts')}
          className={`flex-1 py-3 flex items-center justify-center gap-2 transition-colors ${
            activeTab === 'contacts' ? 'border-b-2 border-blue-500 text-blue-600' : 'text-gray-600'
          }`}
        >
          <Users className="w-4 h-4" />
          Contacts
        </button>
      </div>

      {/* Action Buttons */}
      <div className="p-3 border-b flex gap-2">
        <Button variant="outline" size="sm" onClick={onNewChat} className="flex-1">
          <UserPlus className="w-4 h-4 mr-2" />
          New Chat
        </Button>
        <Button variant="outline" size="sm" onClick={onScheduledClick}>
          <Calendar className="w-4 h-4" />
        </Button>
      </div>

      {/* Conversation List */}
      <ScrollArea className="flex-1">
        {activeTab === 'chats' ? (
          <div className="p-2">
            {filteredConversations.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <MessageSquare className="w-12 h-12 mx-auto mb-2 opacity-20" />
                <p>No conversations yet</p>
                <p className="text-sm">Start a new chat to get started</p>
              </div>
            ) : (
              filteredConversations.map((conv) => (
                <button
                  key={conv.id}
                  onClick={() => onConversationSelect(conv)}
                  className={`w-full p-3 rounded-lg hover:bg-gray-50 transition-colors flex items-start gap-3 ${
                    selectedConversationId === conv.id ? 'bg-blue-50' : ''
                  }`}
                >
                  <Avatar>
                    <AvatarFallback className={conv.groupId ? 'bg-purple-100 text-purple-600' : 'bg-blue-100 text-blue-600'}>
                      {getConversationInitials(conv)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0 text-left">
                    <div className="flex items-center justify-between mb-1">
                      <span className="truncate">{getConversationName(conv)}</span>
                      {conv.lastMessageTime && (
                        <span className="text-xs text-gray-500 flex-shrink-0 ml-2">
                          {formatTime(conv.lastMessageTime)}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center justify-between">
                      <p className="text-sm text-gray-500 truncate">{conv.lastMessage || 'No messages yet'}</p>
                      {conv.unreadCount > 0 && (
                        <Badge variant="default" className="ml-2 flex-shrink-0">
                          {conv.unreadCount}
                        </Badge>
                      )}
                    </div>
                  </div>
                </button>
              ))
            )}
          </div>
        ) : (
          <div className="p-2">
            {filteredUsers.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <Users className="w-12 h-12 mx-auto mb-2 opacity-20" />
                <p>No contacts found</p>
              </div>
            ) : (
              filteredUsers.map((user) => (
                <button
                  key={user.id}
                  onClick={() => startNewChat(user.id)}
                  className="w-full p-3 rounded-lg hover:bg-gray-50 transition-colors flex items-center gap-3"
                >
                  <Avatar>
                    <AvatarFallback className="bg-blue-100 text-blue-600">
                      {user.name.split(' ').map((n: any) => n[0]).join('').toUpperCase().slice(0, 2)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0 text-left">
                    <p className="truncate">{user.name}</p>
                    <p className="text-sm text-gray-500 truncate">{user.email}</p>
                  </div>
                </button>
              ))
            )}
          </div>
        )}
      </ScrollArea>
    </div>
  );
}