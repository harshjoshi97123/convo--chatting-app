import { useState, useEffect } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { ScrollArea } from './ui/scroll-area';
import { FileImage, FileText, Link, X, Download, Music, Loader2 } from 'lucide-react';
import { Button } from './ui/button';
import { motion, AnimatePresence } from 'motion/react';
import { projectId } from '../utils/supabase/info';

interface Message {
  id: string;
  content: string;
  type: string;
  timestamp: string;
  senderId: string;
}

interface SharedMediaPanelProps {
  conversationId: string;
  accessToken: string;
  onClose: () => void;
}

export function SharedMediaPanel({ conversationId, accessToken, onClose }: SharedMediaPanelProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchMessages();
  }, [conversationId]);

  const fetchMessages = async () => {
    setLoading(true);
    try {
      // Correct ID if it's a room and missing the prefix
      let finalId = conversationId;
      if (!conversationId.startsWith('conv:') && (conversationId.startsWith('room-') || conversationId.length > 20)) {
        finalId = `conv:group:${conversationId}`;
      }

      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-5b740c2f/messages/${finalId}`,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        }
      );

      if (response.ok) {
        const data = await response.json();
        setMessages(data.messages || []);
      }
    } catch (error) {
      console.error('Error fetching messages:', error);
    } finally {
      setLoading(false);
    }
  };

  const mediaMessages = messages.filter(msg => ['image', 'video', 'audio'].includes(msg.type));
  const documentMessages = messages.filter(msg => ['document', 'file'].includes(msg.type));
  const linkMessages = messages.filter(msg => 
    msg.type === 'text' && (msg.content.includes('http://') || msg.content.includes('https://'))
  );

  return (
    <div className="w-80 border-l bg-background h-full flex flex-col shadow-2xl z-50 animate-in slide-in-from-right duration-300">
      <div className="p-4 border-b flex items-center justify-between bg-muted/5 sticky top-0 z-10 backdrop-blur-md">
        <h3 className="font-bold text-xs uppercase tracking-[0.2em] text-muted-foreground flex items-center gap-2">
          Shared Media
          <span className="bg-muted px-1.5 py-0.5 rounded text-[10px]">{messages.length}</span>
        </h3>
        <Button variant="ghost" size="icon" onClick={onClose} className="w-8 h-8 rounded-full">
          <X className="w-4 h-4" />
        </Button>
      </div>

      <Tabs defaultValue="media" className="flex-1 flex flex-col overflow-hidden">
        <TabsList className="w-full justify-start rounded-none border-b bg-transparent h-12 p-0 px-2 gap-2">
          <TabsTrigger value="media" className="h-full border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent rounded-none px-4 text-[11px] font-bold uppercase tracking-widest">
            Media
          </TabsTrigger>
          <TabsTrigger value="docs" className="h-full border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent rounded-none px-4 text-[11px] font-bold uppercase tracking-widest">
            Docs
          </TabsTrigger>
          <TabsTrigger value="links" className="h-full border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent rounded-none px-4 text-[11px] font-bold uppercase tracking-widest">
            Links
          </TabsTrigger>
        </TabsList>

        <div className="flex-1 overflow-hidden relative">
          <AnimatePresence mode="wait">
            {loading ? (
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 flex flex-col items-center justify-center gap-3 opacity-40 capitalize"
              >
                <Loader2 className="w-8 h-8 animate-spin" />
                <p className="text-[10px] font-bold tracking-widest">Indexing Archives...</p>
              </motion.div>
            ) : (
              <>
                <TabsContent value="media" className="h-full m-0 outline-none">
                  <ScrollArea className="h-full">
                    {mediaMessages.length === 0 ? (
                      <div className="p-12 text-center opacity-20 flex flex-col items-center gap-3">
                        <FileImage className="w-12 h-12" />
                        <p className="text-xs font-bold uppercase tracking-widest">Gallery Empty</p>
                      </div>
                    ) : (
                      <div className="p-3 grid grid-cols-3 gap-1.5">
                        {mediaMessages.map((msg, index) => (
                          <motion.div
                            key={msg.id}
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ delay: index * 0.02 }}
                            className="group aspect-square rounded-lg overflow-hidden bg-muted/30 relative cursor-pointer border border-white/5 shadow-sm hover:shadow-lg transition-all"
                          >
                            {msg.type === 'image' ? (
                              <img src={msg.content} alt="" className="w-full h-full object-cover transition-transform group-hover:scale-110" />
                            ) : msg.type === 'video' ? (
                              <video src={msg.content} className="w-full h-full object-cover" />
                            ) : (
                              <div className="w-full h-full flex flex-col items-center justify-center gap-2 p-2">
                                <Music className="w-5 h-5 text-primary opacity-60" />
                                <span className="text-[9px] font-bold uppercase opacity-40">Audio</span>
                              </div>
                            )}
                            
                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center backdrop-blur-[1px]">
                              <Button 
                                size="icon" 
                                variant="secondary" 
                                className="w-8 h-8 rounded-full"
                                onClick={(e: React.MouseEvent) => { e.stopPropagation(); window.open(msg.content, '_blank'); }}
                              >
                                <Download className="w-3.5 h-3.5" />
                              </Button>
                            </div>
                          </motion.div>
                        ))}
                      </div>
                    )}
                  </ScrollArea>
                </TabsContent>

                <TabsContent value="docs" className="h-full m-0 outline-none">
                  <ScrollArea className="h-full">
                    {documentMessages.length === 0 ? (
                      <div className="p-12 text-center opacity-20 flex flex-col items-center gap-3">
                        <FileText className="w-12 h-12" />
                        <p className="text-xs font-bold uppercase tracking-widest">No Documents</p>
                      </div>
                    ) : (
                      <div className="p-3 space-y-2">
                        {documentMessages.map((msg) => {
                          const fileName = msg.content.split('/').pop()?.split('-').slice(1).join('-') || 'Attachment';
                          return (
                            <motion.div
                              key={msg.id}
                              initial={{ opacity: 0, x: 20 }}
                              animate={{ opacity: 1, x: 0 }}
                              className="p-3 rounded-xl border bg-muted/5 flex items-center gap-3 group hover:border-primary/30 transition-all cursor-default"
                            >
                              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0 group-hover:scale-105 transition-transform">
                                <FileText className="w-5 h-5 text-primary" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-xs font-bold truncate group-hover:text-primary transition-colors">{fileName}</p>
                                <p className="text-[10px] text-muted-foreground uppercase font-medium mt-0.5">
                                  {new Date(msg.timestamp).toLocaleDateString()}
                                </p>
                              </div>
                              <Button 
                                variant="ghost" 
                                size="icon" 
                                className="w-8 h-8 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                                onClick={() => window.open(msg.content, '_blank')}
                              >
                                <Download className="w-4 h-4" />
                              </Button>
                            </motion.div>
                          );
                        })}
                      </div>
                    )}
                  </ScrollArea>
                </TabsContent>

                <TabsContent value="links" className="h-full m-0 outline-none">
                  <ScrollArea className="h-full">
                    {linkMessages.length === 0 ? (
                      <div className="p-12 text-center opacity-20 flex flex-col items-center gap-3">
                        <Link className="w-12 h-12" />
                        <p className="text-xs font-bold uppercase tracking-widest">No Links</p>
                      </div>
                    ) : (
                      <div className="p-3 space-y-2">
                        {linkMessages.map((msg) => {
                          const urlMatch = msg.content.match(/(https?:\/\/[^\s]+)/);
                          const url = urlMatch ? urlMatch[0] : '';
                          return (
                            <motion.a
                              key={msg.id}
                              href={url}
                              target="_blank"
                              rel="noopener noreferrer"
                              initial={{ opacity: 0, x: 20 }}
                              animate={{ opacity: 1, x: 0 }}
                              className="block p-3 rounded-xl border bg-muted/5 hover:border-primary/30 transition-all group"
                            >
                              <div className="flex items-start gap-3">
                                <div className="w-10 h-10 rounded-lg bg-indigo-500/10 flex items-center justify-center flex-shrink-0">
                                  <Link className="w-5 h-5 text-indigo-500" />
                                </div>
                                <div className="flex-1 min-w-0">
                                  <p className="text-xs font-bold truncate text-primary group-hover:underline">{url}</p>
                                  <p className="text-[10px] text-muted-foreground uppercase font-medium mt-0.5">
                                    {new Date(msg.timestamp).toLocaleDateString()}
                                  </p>
                                </div>
                              </div>
                            </motion.a>
                          );
                        })}
                      </div>
                    )}
                  </ScrollArea>
                </TabsContent>
              </>
            )}
          </AnimatePresence>
        </div>
      </Tabs>
      
      <div className="p-4 border-t bg-muted/5 flex items-center justify-center">
        <span className="text-[9px] font-bold text-muted-foreground/30 uppercase tracking-[0.3em]">Archive Secure</span>
      </div>
    </div>
  );
}
