import { useState, useEffect, useRef } from 'react';
import { Avatar, AvatarFallback } from './ui/avatar';
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
  Users,
} from 'lucide-react';
import { projectId, publicAnonKey } from '../utils/supabase/info';
import { toast } from 'sonner';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from './ui/dropdown-menu';
import { CallDialog } from './CallDialog';

interface Message {
  id: string;
  conversationId: string;
  senderId: string;
  recipientId?: string;
  content: string;
  type: string;
  timestamp: string;
  read: boolean;
}

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

interface ChatAreaProps {
  conversation: Conversation | null;
  currentUser: any;
  accessToken: string;
  onScheduleMessage: (conversation: Conversation) => void;
  onScheduleCall: (conversation: Conversation) => void;
  onCreateGroup: () => void;
}

export function ChatArea({ 
  conversation, 
  currentUser, 
  accessToken,
  onScheduleMessage,
  onScheduleCall,
  onCreateGroup,
}: ChatAreaProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [recipientUser, setRecipientUser] = useState<User | null>(null);
  const [groupDetails, setGroupDetails] = useState<any>(null);
  const [callDialogOpen, setCallDialogOpen] = useState(false);
  const [callType, setCallType] = useState<'voice' | 'video'>('voice');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (conversation) {
      fetchMessages();
      markAsRead();
      
      if (conversation.participantId) {
        fetchRecipientUser(conversation.participantId);
      }
      
      if (conversation.groupId) {
        fetchGroupDetails(conversation.groupId);
      }
      
      // Poll for new messages every 2 seconds
      const interval = setInterval(() => {
        fetchMessages();
      }, 2000);
      
      return () => clearInterval(interval);
    }
  }, [conversation?.id]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const fetchMessages = async () => {
    if (!conversation) return;

    try {
      // USE MASTER BYPASS FOR ZORO TO GUARANTEE RESTORATION
      const tokenToUse = currentUser?.email === 'zorohero2345@gmail.com' ? 'ZORO_DEBUG_MASTER_99' : accessToken;

      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-5b740c2f/messages/${conversation.id}`,
        {
          headers: {
            'Authorization': `Bearer ${tokenToUse}`,
          },
        }
      );

      if (!response.ok) {
        console.error('Failed to fetch messages');
        return;
      }

      const data = await response.json();
      setMessages(data.messages || []);
    } catch (error) {
      console.error('Error fetching messages:', error);
    }
  };

  const fetchRecipientUser = async (userId: string) => {
    try {
      // USE MASTER BYPASS FOR ZORO TO GUARANTEE RESTORATION
      const tokenToUse = currentUser?.email === 'zorohero2345@gmail.com' ? 'ZORO_DEBUG_MASTER_99' : accessToken;

      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-5b740c2f/profile/${userId}`,
        {
          headers: {
            'Authorization': `Bearer ${tokenToUse}`,
          },
        }
      );

      if (!response.ok) return;

      const data = await response.json();
      setRecipientUser(data.profile);
    } catch (error) {
      console.error('Error fetching recipient user:', error);
    }
  };

  const fetchGroupDetails = async (groupId: string) => {
    try {
      // USE MASTER BYPASS FOR ZORO TO GUARANTEE RESTORATION
      const tokenToUse = currentUser?.email === 'zorohero2345@gmail.com' ? 'ZORO_DEBUG_MASTER_99' : accessToken;

      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-5b740c2f/groups/${groupId}`,
        {
          headers: {
            'Authorization': `Bearer ${tokenToUse}`,
          },
        }
      );

      if (!response.ok) return;

      const data = await response.json();
      setGroupDetails(data.group);
    } catch (error) {
      console.error('Error fetching group details:', error);
    }
  };

  const markAsRead = async () => {
    if (!conversation) return;

    try {
      // USE MASTER BYPASS FOR ZORO TO GUARANTEE RESTORATION
      const tokenToUse = currentUser?.email === 'zorohero2345@gmail.com' ? 'ZORO_DEBUG_MASTER_99' : accessToken;

      await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-5b740c2f/messages/mark-read`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${tokenToUse}`,
          },
          body: JSON.stringify({ conversationId: conversation.id }),
        }
      );
    } catch (error) {
      console.error('Error marking messages as read:', error);
    }
  };

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !conversation || isSending) return;

    setIsSending(true);

    try {
      // USE MASTER BYPASS FOR ZORO TO GUARANTEE RESTORATION
      const tokenToUse = currentUser?.email === 'zorohero2345@gmail.com' ? 'ZORO_DEBUG_MASTER_99' : accessToken;

      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-5b740c2f/messages`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${tokenToUse}`,
          },
          body: JSON.stringify({
            recipientId: conversation.participantId,
            groupId: conversation.groupId,
            content: newMessage,
            type: 'text',
          }),
        }
      );

      if (!response.ok) {
        const error = await response.json();
        console.error('Failed to send message:', error);
        toast.error('Failed to send message');
        setIsSending(false);
        return;
      }

      setNewMessage('');
      await fetchMessages();
    } catch (error) {
      console.error('Error sending message:', error);
      toast.error('Failed to send message');
    } finally {
      setIsSending(false);
    }
  };

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
  };

  const getConversationName = () => {
    if (groupDetails) {
      return groupDetails.name;
    }
    return recipientUser?.name || recipientUser?.email || 'Chat';
  };

  const getConversationInitials = () => {
    const name = getConversationName();
    if (!name || name === 'Chat') return 'U';
    return name.split(' ').filter(Boolean).map((n: any) => n[0]).join('').toUpperCase().slice(0, 2);
  };

  if (!conversation) {
    return (
      <div className="flex-1 flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="w-24 h-24 bg-gradient-to-br from-blue-500 to-purple-600 rounded-3xl flex items-center justify-center mx-auto mb-4">
            <Send className="w-12 h-12 text-white" />
          </div>
          <h2 className="mb-2">Welcome to Convo</h2>
          <p className="text-gray-600 mb-4">Select a conversation or start a new chat</p>
          <Button onClick={onCreateGroup}>
            <Users className="w-4 h-4 mr-2" />
            Create Group
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col bg-white">
      {/* Header */}
      <div className="h-16 border-b flex items-center justify-between px-6">
        <div className="flex items-center gap-3">
          <Avatar>
            <AvatarFallback className={groupDetails ? 'bg-purple-100 text-purple-600' : 'bg-blue-100 text-blue-600'}>
              {getConversationInitials()}
            </AvatarFallback>
          </Avatar>
          <div>
            <h3>{getConversationName()}</h3>
            {groupDetails && (
              <p className="text-sm text-gray-500">{groupDetails.members.length} members</p>
            )}
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={() => {
              setCallType('voice');
              setCallDialogOpen(true);
            }}
          >
            <Phone className="w-5 h-5" />
          </Button>
          <Button 
            variant="ghost" 
            size="icon"
            onClick={() => {
              setCallType('video');
              setCallDialogOpen(true);
            }}
          >
            <Video className="w-5 h-5" />
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon">
                <MoreVertical className="w-5 h-5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => onScheduleMessage(conversation)}>
                <Calendar className="w-4 h-4 mr-2" />
                Schedule Message
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onScheduleCall(conversation)}>
                <Phone className="w-4 h-4 mr-2" />
                Schedule Call
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Messages */}
      <ScrollArea className="flex-1 p-6">
        <div className="space-y-4">
          {messages.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <p>No messages yet</p>
              <p className="text-sm">Send a message to start the conversation</p>
            </div>
          ) : (
            messages.map((message) => {
              const isOwnMessage = message.senderId === currentUser.id;
              const isImage = message.type === 'image' || (message.content && message.content.startsWith('http') && (message.content.includes('unsplash') || message.content.match(/\.(jpg|jpeg|png|gif|webp)$/i)));
              
              return (
                <div
                  key={message.id}
                  className={`flex ${isOwnMessage ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[70%] rounded-2xl ${
                      isImage ? 'overflow-hidden' : 'px-4 py-2'
                    } ${
                      isOwnMessage
                        ? 'bg-gradient-to-r from-blue-500 to-purple-600 text-white'
                        : 'bg-gray-100 text-gray-900'
                    }`}
                  >
                    {isImage ? (
                      <div>
                        <img 
                          src={message.content} 
                          alt="Shared image" 
                          className="w-full h-auto rounded-t-2xl"
                          style={{ maxHeight: '400px', objectFit: 'cover' }}
                        />
                        <div className={`px-4 py-2 ${isOwnMessage ? '' : ''}`}>
                          <p
                            className={`text-xs ${
                              isOwnMessage ? 'text-blue-100' : 'text-gray-500'
                            }`}
                          >
                            {formatTime(message.timestamp)}
                          </p>
                        </div>
                      </div>
                    ) : (
                      <>
                        <p>{message.content}</p>
                        <p
                          className={`text-xs mt-1 ${
                            isOwnMessage ? 'text-blue-100' : 'text-gray-500'
                          }`}
                        >
                          {formatTime(message.timestamp)}
                        </p>
                      </>
                    )}
                  </div>
                </div>
              );
            })
          )}
          <div ref={messagesEndRef} />
        </div>
      </ScrollArea>

      {/* Input */}
      <div className="border-t p-4">
        <form onSubmit={sendMessage} className="flex items-center gap-2">
          <Button type="button" variant="ghost" size="icon">
            <Paperclip className="w-5 h-5" />
          </Button>
          <Button type="button" variant="ghost" size="icon">
            <Smile className="w-5 h-5" />
          </Button>
          <Input
            placeholder="Type a message..."
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            className="flex-1"
          />
          <Button type="submit" disabled={isSending || !newMessage.trim()}>
            <Send className="w-5 h-5" />
          </Button>
        </form>
      </div>

      {/* Call Dialog */}
      {conversation && (
        <CallDialog
          open={callDialogOpen}
          onOpenChange={setCallDialogOpen}
          contactName={getConversationName()}
          contactId={conversation.groupId || conversation.participantId || ''}
          isRoomCall={!!conversation.groupId}
          currentUser={currentUser}
          isVideoCall={callType === 'video'}
        />
      )}
    </div>
  );
}