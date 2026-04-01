import { useState, useEffect } from 'react';
import { EmojiText } from './EmojiText';
import { ScrollArea } from './ui/scroll-area';
import { Calendar, Phone, Video, MessageSquare, Trash2, Clock } from 'lucide-react';
import { Button } from './ui/button';
import { motion } from 'motion/react';
import { projectId, publicAnonKey } from '../utils/supabase/info';
import { toast } from 'sonner';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from './ui/alert-dialog';

interface ScheduledItem {
  id: string;
  type: 'message' | 'call';
  recipientId: string;
  content?: string;
  callType?: string;
  scheduledFor: string;
  status: string;
  createdAt: string;
}

interface User {
  id: string;
  name: string;
  email: string;
}

interface ScheduledPanelProps {
  accessToken: string;
  currentUserId: string;
  onSelectItem?: (item: any) => void;
}

export function ScheduledPanel({ accessToken, currentUserId, onSelectItem }: ScheduledPanelProps) {
  const [scheduledMessages, setScheduledMessages] = useState<ScheduledItem[]>([]);
  const [scheduledCalls, setScheduledCalls] = useState<ScheduledItem[]>([]);
  const [users, setUsers] = useState<Record<string, User>>({});
  const [now, setNow] = useState(new Date());
  const [deleteDialog, setDeleteDialog] = useState<{ open: boolean; item: ScheduledItem | null }>({
    open: false,
    item: null,
  });

  useEffect(() => {
    fetchScheduledItems();
    fetchUsers();
    
    // Update 'now' every minute for the countdown
    const timer = setInterval(() => setNow(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);

  const fetchUsers = async () => {
    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-5b740c2f/users`,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        }
      );

      if (response.ok) {
        const data = await response.json();
        const usersMap: Record<string, User> = {};
        data.users.forEach((user: User) => {
          usersMap[user.id] = user;
        });
        setUsers(usersMap);
      }
    } catch (error) {
      console.error('Error fetching users:', error);
    }
  };

  const fetchScheduledItems = async () => {
    let edgeMsgs: ScheduledItem[] = [];
    let edgeCalls: ScheduledItem[] = [];

    try {
      const [messagesRes, callsRes] = await Promise.all([
        fetch(
          `https://${projectId}.supabase.co/functions/v1/make-server-5b740c2f/scheduled-messages`,
          { headers: { Authorization: `Bearer ${accessToken}` } }
        ),
        fetch(
          `https://${projectId}.supabase.co/functions/v1/make-server-5b740c2f/scheduled-calls`,
          { headers: { Authorization: `Bearer ${accessToken}` } }
        ),
      ]);

      if (messagesRes.ok) {
        edgeMsgs = (await messagesRes.json()).scheduledMessages || [];
      }
      if (callsRes.ok) {
        edgeCalls = (await callsRes.json()).scheduledCalls || [];
      }
    } catch (error) {
      console.warn('Edge fetch for scheduled items failed, relying on SQL:', error);
    }

    // SQL Fallback & Merging
    try {
      const { getSupabaseClient } = await import('../utils/supabase/client');
      const supabase = getSupabaseClient();
      
      const { data: kvItems } = await supabase
        .from('kv_store_5b740c2f' as any)
        .select('*')
        .like('key', 'scheduled-%');

      if (kvItems) {
        const sqlItems = (kvItems as any[]).map(item => ({
          ...item.value,
          scheduledFor: item.value.scheduledFor || item.value.timestamp || item.value.createdAt
        }));

        const sqlMsgs = sqlItems.filter(i => i.type === 'message' || i.key?.includes('message'));
        const sqlCalls = sqlItems.filter(i => i.type === 'call' || i.key?.includes('call'));

        // Merge and deduplicate by ID
        const merge = (edge: any[], sql: any[]) => {
          const map = new Map();
          edge.forEach(i => map.set(i.id, i));
          sql.forEach(i => map.set(i.id, i));
          return Array.from(map.values());
        };

        setScheduledMessages(merge(edgeMsgs, sqlMsgs));
        setScheduledCalls(merge(edgeCalls, sqlCalls));
      } else {
        setScheduledMessages(edgeMsgs);
        setScheduledCalls(edgeCalls);
      }
    } catch (sqlErr) {
      console.error('SQL fallback for scheduled items failed:', sqlErr);
      setScheduledMessages(edgeMsgs);
      setScheduledCalls(edgeCalls);
    }
  };

  const handleDelete = async (e: React.MouseEvent, item: ScheduledItem) => {
    e.stopPropagation();
    setDeleteDialog({ open: true, item });
  };

  const confirmDelete = async () => {
    if (!deleteDialog.item) return;

    try {
      const { getSupabaseClient } = await import('../utils/supabase/client');
      const supabase = getSupabaseClient();
      const key = `scheduled-${deleteDialog.item.type}:${currentUserId}:${deleteDialog.item.id}`;

      // AGGRESSIVE SEARCH: Find the scheduled item by its internal ID across all possible keys
      const { data: records, error: fetchError } = await supabase
        .from('kv_store_5b740c2f' as any)
        .select('key')
        .contains('value', { id: deleteDialog.item.id });

      let lastError: any = fetchError;
      let deleteSuccess = false;
      if (!fetchError && records && (records as any[]).length > 0) {
        const matchedKey = (records as any[])[0].key;
        const { error: deleteError } = await (supabase
          .from('kv_store_5b740c2f' as any) as any)
          .delete()
          .eq('key', matchedKey);
        
        if (!deleteError) deleteSuccess = true;
        else lastError = deleteError;
      }

      if (deleteSuccess) {
        toast.success(`${deleteDialog.item.type === 'message' ? 'Message' : 'Call'} unscheduled successfully`);
        setDeleteDialog({ open: false, item: null });
        fetchScheduledItems();
      } else {
        if (lastError) toast.error(`DB Delete Error: ${lastError.message} (${lastError.code})`);
        else toast.info("Scheduled item not found in cloud storage.");
        console.error('Direct Delete Error:', lastError);
        // Fallback to Edge Function if DB direct delete fails (e.g. RLS)
        const { projectId } = await import('../utils/supabase/info');
        const fallbackResponse = await fetch(
          `https://${projectId}.supabase.co/functions/v1/make-server-5b740c2f/scheduled-items/${deleteDialog.item.type}/${deleteDialog.item.id}`,
          {
            method: 'DELETE',
            headers: {
              Authorization: `Bearer ${accessToken}`,
              'Content-Type': 'application/json',
            },
          }
        );

        if (fallbackResponse.ok) {
          toast.success(`${deleteDialog.item.type === 'message' ? 'Message' : 'Call'} unscheduled successfully`);
          setDeleteDialog({ open: false, item: null });
          fetchScheduledItems();
        } else {
          const error = await fallbackResponse.json();
          toast.error(error.error || 'Failed to delete scheduled item');
        }
      }
    } catch (error) {
      console.error('Error deleting scheduled item:', error);
      toast.error('An error occurred while deleting');
    }
  };

  const formatDateTime = (dateString: string) => {
    const date = new Date(dateString);
    const diffMs = date.getTime() - now.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMs < 0) return 'Due';
    if (diffMins < 60) {
      return `in ${diffMins} minutes`;
    } else if (diffHours < 24) {
      return `in ${diffHours} hours`;
    } else if (diffDays < 7) {
      return `in ${diffDays} days`;
    }

    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  };

  const allItems = [
    ...scheduledMessages.map(msg => ({ ...msg, type: 'message' as const })),
    ...scheduledCalls.map(call => ({ ...call, type: 'call' as const })),
  ].sort((a, b) => new Date(a.scheduledFor).getTime() - new Date(b.scheduledFor).getTime());

  return (
    <>
      <ScrollArea className="h-full">
        {allItems.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground">
            <Calendar className="w-12 h-12 mx-auto mb-2 opacity-20" />
            <p>No scheduled items</p>
            <p className="text-xs mt-1">Schedule messages and calls to send later</p>
          </div>
        ) : (
          <div className="p-4 space-y-3 pb-20">
            {allItems.map((item: any, index: number) => {
              const recipient = users[item.recipientId];
              // Use Vault-enriched data if available
              const displayName = item.receiver_name || recipient?.name || 'Unknown User';
              
              const isMessage = item.type === 'message';
              const isPast = new Date(item.scheduledFor) < now;
              const isSent = item.status === 'sent';

              return (
                <motion.div
                  key={item.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                  onClick={() => onSelectItem?.(item)}
                  className={`p-4 border rounded-xl hover:shadow-md transition-all cursor-pointer group hover:border-primary/30 relative overflow-hidden ${
                    isSent ? 'bg-muted/30 border-dashed' : 'bg-background hover:bg-muted/10'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div
                      className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${
                        isSent
                          ? 'bg-emerald-500/10 text-emerald-600 border border-emerald-500/20'
                          : isMessage
                          ? 'bg-blue-500/10 text-blue-600'
                          : item.callType === 'video'
                          ? 'bg-purple-500/10 text-purple-600'
                          : 'bg-green-500/10 text-green-600'
                      }`}
                    >
                      {isSent ? (
                        <Clock className="w-5 h-5" />
                      ) : isMessage ? (
                        <MessageSquare className="w-5 h-5" />
                      ) : item.callType === 'video' ? (
                        <Video className="w-5 h-5" />
                      ) : (
                        <Phone className="w-5 h-5" />
                      )}
                    </div>
  
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold truncate">
                            {displayName}
                          </p>
                          <p className="text-sm text-muted-foreground truncate mt-1">
                            <EmojiText text={item.content || (item.callType === 'video' ? 'Video call' : 'Voice call')} size={14} />
                          </p>
                        </div>
  
                        <Button
                          variant="ghost"
                          size="icon"
                          className="shrink-0 w-8 h-8 text-destructive opacity-0 group-hover:opacity-100 transition-opacity hover:bg-destructive/10"
                          onClick={(e: React.MouseEvent) => handleDelete(e, item)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
  
                      <div className="flex items-center gap-2 mt-2">
                        <div className={`flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          isSent ? 'bg-emerald-500/10 text-emerald-600' : 'bg-muted text-muted-foreground'
                        }`}>
                          <Clock className="w-3 h-3" />
                          <span>{formatDateTime(item.scheduledFor)}</span>
                        </div>
                        {isSent && (
                          <span className="text-[10px] font-bold text-emerald-600 uppercase tracking-widest">SENT</span>
                        )}
                        {!isSent && isPast && (
                          <span className="text-[10px] font-bold text-amber-500 uppercase tracking-widest">DUE SOON</span>
                        )}
                      </div>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </ScrollArea>

      <AlertDialog open={deleteDialog.open} onOpenChange={(open: boolean) => setDeleteDialog({ open, item: null })}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete scheduled item?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete this scheduled{' '}
              {deleteDialog.item?.type === 'message' ? 'message' : 'call'}.
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
