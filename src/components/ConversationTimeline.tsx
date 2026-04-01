import { useState } from 'react';
import { ScrollArea } from './ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { X, Star, Clock, Image as ImageIcon, FileText, Calendar, Phone, Video } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface Message {
  id: string;
  senderId: string;
  content: string;
  timestamp: string;
  type: 'text' | 'image' | 'video' | 'document' | 'file' | 'audio';
  isDeletedForEveryone?: boolean;
}

interface ScheduledItem {
  id: string;
  type: 'message' | 'call';
  content?: string;
  callType?: string;
  scheduledTime?: string;
  scheduledFor?: string;
  recipientId?: string;
  status: string;
}

interface ConversationTimelineProps {
  open: boolean;
  onClose: () => void;
  messages: Message[];
  starredMessageIds: string[];
  scheduledItems: ScheduledItem[];
  currentUser: { id: string; name: string; avatar?: string | null };
  recipientUser: { id: string; name: string; avatar?: string | null } | null;
  groupName?: string;
  onUnstar: (messageId: string) => void;
}

export function ConversationTimeline({
  open,
  onClose,
  messages,
  starredMessageIds,
  scheduledItems,
  currentUser,
  recipientUser,
  groupName,
  onUnstar,
}: ConversationTimelineProps) {
  const [activeTab, setActiveTab] = useState('highlights');

  const starredMessages = messages.filter((m) => starredMessageIds.includes(m.id) && !m.isDeletedForEveryone);
  const mediaMessages = messages.filter((m) => (m.type === 'image' || m.type === 'video') && !m.isDeletedForEveryone);
  const fileMessages = messages.filter((m) => m.type === 'file' || m.type === 'document');

  const getInitials = (name: string) => {
    if (!name || name === 'Loading...') return 'U';
    return name.split(' ').filter(Boolean).map((n) => n[0]).join('').toUpperCase().slice(0, 2);
  };

  const getSenderName = (senderId: string) => {
    if (senderId === currentUser.id) return 'You';
    return recipientUser?.name || groupName || 'Unknown';
  };

  const getSenderAvatar = (senderId: string) => {
    if (senderId === currentUser.id) return currentUser.avatar;
    return recipientUser?.avatar;
  };

  const formatTime = (timestamp: string) => {
    return new Date(timestamp).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  };

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/20 z-10"
            onClick={onClose}
          />

          {/* Panel */}
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="absolute right-0 top-0 bottom-0 w-80 bg-background border-l shadow-xl z-20 flex flex-col"
          >
            {/* Header */}
            <div className="p-4 border-b flex items-center justify-between bg-gradient-to-r from-blue-500/5 to-purple-500/5">
              <div className="flex items-center gap-2">
                <Clock className="w-5 h-5 text-blue-500" />
                <h3 className="font-semibold">Conversation Timeline</h3>
              </div>
              <Button variant="ghost" size="icon" onClick={onClose}>
                <X className="w-4 h-4" />
              </Button>
            </div>

            {/* Tabs */}
            <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col overflow-hidden">
              <TabsList className="w-full rounded-none border-b bg-transparent px-2 h-12 flex-shrink-0">
                <TabsTrigger value="highlights" className="flex-1 text-xs gap-1 data-[state=active]:text-yellow-600">
                  <Star className="w-3.5 h-3.5" />
                  Highlights
                  {starredMessages.length > 0 && (
                    <Badge variant="secondary" className="ml-1 text-xs px-1 py-0 h-4">{starredMessages.length}</Badge>
                  )}
                </TabsTrigger>
                <TabsTrigger value="scheduled" className="flex-1 text-xs gap-1 data-[state=active]:text-blue-600">
                  <Calendar className="w-3.5 h-3.5" />
                  Scheduled
                  {scheduledItems.length > 0 && (
                    <Badge variant="secondary" className="ml-1 text-xs px-1 py-0 h-4">{scheduledItems.length}</Badge>
                  )}
                </TabsTrigger>
                <TabsTrigger value="media" className="flex-1 text-xs gap-1 data-[state=active]:text-green-600">
                  <ImageIcon className="w-3.5 h-3.5" />
                  Media
                  {mediaMessages.length > 0 && (
                    <Badge variant="secondary" className="ml-1 text-xs px-1 py-0 h-4">{mediaMessages.length}</Badge>
                  )}
                </TabsTrigger>
              </TabsList>

              {/* Highlights Tab */}
              <TabsContent value="highlights" className="flex-1 m-0 overflow-hidden">
                <ScrollArea className="h-full">
                  {starredMessages.length === 0 ? (
                    <div className="p-8 text-center text-muted-foreground">
                      <Star className="w-10 h-10 mx-auto mb-2 opacity-20" />
                      <p className="text-sm">No starred messages yet</p>
                      <p className="text-xs mt-1 opacity-70">Right-click a message to star it</p>
                    </div>
                  ) : (
                    <div className="p-3 space-y-3">
                      {starredMessages.map((msg) => {
                        const senderName = getSenderName(msg.senderId);
                        const senderAvatar = getSenderAvatar(msg.senderId);
                        return (
                          <motion.div
                            key={msg.id}
                            initial={{ opacity: 0, y: 5 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-700/40 rounded-xl p-3"
                          >
                            <div className="flex items-center gap-2 mb-2">
                              <Avatar className="w-6 h-6">
                                {senderAvatar && <AvatarImage src={senderAvatar} />}
                                <AvatarFallback className="text-xs bg-gradient-to-br from-blue-400 to-purple-500 text-white">
                                  {getInitials(senderName)}
                                </AvatarFallback>
                              </Avatar>
                              <span className="text-xs font-medium">{senderName}</span>
                              <span className="text-xs text-muted-foreground ml-auto">{formatTime(msg.timestamp)}</span>
                              <button
                                onClick={() => onUnstar(msg.id)}
                                className="text-yellow-500 hover:text-yellow-300 transition-colors"
                                title="Remove star"
                              >
                                <Star className="w-3.5 h-3.5 fill-yellow-500" />
                              </button>
                            </div>
                            {msg.type === 'image' ? (
                              <img src={msg.content} alt="Shared" className="w-full rounded-lg object-cover max-h-32" />
                            ) : (
                              <p className="text-sm text-foreground line-clamp-3">{msg.content}</p>
                            )}
                          </motion.div>
                        );
                      })}
                    </div>
                  )}
                </ScrollArea>
              </TabsContent>

              {/* Scheduled Tab */}
              <TabsContent value="scheduled" className="flex-1 m-0 overflow-hidden">
                <ScrollArea className="h-full">
                  {scheduledItems.length === 0 ? (
                    <div className="p-8 text-center text-muted-foreground">
                      <Calendar className="w-10 h-10 mx-auto mb-2 opacity-20" />
                      <p className="text-sm">No scheduled items</p>
                      <p className="text-xs mt-1 opacity-70">Schedule messages or calls from the chat menu</p>
                    </div>
                  ) : (
                    <div className="p-3 space-y-3">
                      {scheduledItems.map((item) => {
                        const scheduledAt = item.scheduledTime || item.scheduledFor || '';
                        return (
                          <motion.div
                            key={item.id}
                            initial={{ opacity: 0, y: 5 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700/40 rounded-xl p-3"
                          >
                            <div className="flex items-center gap-2 mb-1">
                              {item.type === 'call' ? (
                                item.callType === 'video' ? (
                                  <Video className="w-4 h-4 text-purple-500" />
                                ) : (
                                  <Phone className="w-4 h-4 text-green-500" />
                                )
                              ) : (
                                <Clock className="w-4 h-4 text-blue-500" />
                              )}
                              <span className="text-xs font-medium capitalize">
                                {item.type === 'call' ? `${item.callType || 'Voice'} Call` : 'Message'}
                              </span>
                              <Badge variant="outline" className="ml-auto text-xs py-0 h-4 border-blue-300 text-blue-600">
                                {item.status}
                              </Badge>
                            </div>
                            {item.content && (
                              <p className="text-sm text-foreground line-clamp-2 mt-1">{item.content}</p>
                            )}
                            {scheduledAt && (
                              <p className="text-xs text-muted-foreground mt-1.5 flex items-center gap-1">
                                <Clock className="w-3 h-3" />
                                {formatTime(scheduledAt)}
                              </p>
                            )}
                          </motion.div>
                        );
                      })}
                    </div>
                  )}
                </ScrollArea>
              </TabsContent>

              {/* Media Tab */}
              <TabsContent value="media" className="flex-1 m-0 overflow-hidden">
                <ScrollArea className="h-full">
                  {mediaMessages.length === 0 && fileMessages.length === 0 ? (
                    <div className="p-8 text-center text-muted-foreground">
                      <ImageIcon className="w-10 h-10 mx-auto mb-2 opacity-20" />
                      <p className="text-sm">No shared media yet</p>
                    </div>
                  ) : (
                    <div className="p-3">
                      {mediaMessages.length > 0 && (
                        <>
                          <p className="text-xs font-medium text-muted-foreground mb-2 px-1">Photos & Videos</p>
                          <div className="grid grid-cols-3 gap-1 mb-4">
                            {mediaMessages.map((msg) => (
                              <div key={msg.id} className="aspect-square rounded-lg overflow-hidden bg-muted">
                                {msg.type === 'image' ? (
                                  <img src={msg.content} alt="Shared" className="w-full h-full object-cover" />
                                ) : (
                                  <video src={msg.content} className="w-full h-full object-cover" />
                                )}
                              </div>
                            ))}
                          </div>
                        </>
                      )}
                      {fileMessages.length > 0 && (
                        <>
                          <p className="text-xs font-medium text-muted-foreground mb-2 px-1">Files</p>
                          <div className="space-y-2">
                            {fileMessages.map((msg) => (
                              <div key={msg.id} className="flex items-center gap-2 p-2 rounded-lg bg-muted/50 border">
                                <FileText className="w-4 h-4 text-blue-500 flex-shrink-0" />
                                <p className="text-sm truncate">{msg.content}</p>
                              </div>
                            ))}
                          </div>
                        </>
                      )}
                    </div>
                  )}
                </ScrollArea>
              </TabsContent>
            </Tabs>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
