import { useState, useEffect } from 'react';
import { Button } from './ui/button';
import { ScrollArea } from './ui/scroll-area';
import { Badge } from './ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from './ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Calendar, Phone, MessageSquare, Clock } from 'lucide-react';
import { projectId } from '../utils/supabase/info';

interface ScheduledItemsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  accessToken: string;
}

export function ScheduledItemsDialog({ 
  open, 
  onOpenChange, 
  accessToken,
}: ScheduledItemsDialogProps) {
  const [scheduledMessages, setScheduledMessages] = useState<any[]>([]);
  const [scheduledCalls, setScheduledCalls] = useState<any[]>([]);
  const [users, setUsers] = useState<Map<string, any>>(new Map());

  useEffect(() => {
    if (open) {
      fetchScheduledItems();
      fetchUsers();
    }
  }, [open]);

  const fetchScheduledItems = async () => {
    try {
      const [messagesResponse, callsResponse] = await Promise.all([
        fetch(
          `https://${projectId}.supabase.co/functions/v1/make-server-5b740c2f/scheduled-messages`,
          {
            headers: {
              'Authorization': `Bearer ${accessToken}`,
            },
          }
        ),
        fetch(
          `https://${projectId}.supabase.co/functions/v1/make-server-5b740c2f/scheduled-calls`,
          {
            headers: {
              'Authorization': `Bearer ${accessToken}`,
            },
          }
        ),
      ]);

      if (messagesResponse.ok) {
        const messagesData = await messagesResponse.json();
        setScheduledMessages(messagesData.scheduledMessages || []);
      }

      if (callsResponse.ok) {
        const callsData = await callsResponse.json();
        setScheduledCalls(callsData.scheduledCalls || []);
      }
    } catch (error) {
      console.error('Error fetching scheduled items:', error);
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

      if (!response.ok) return;

      const data = await response.json();
      const userMap = new Map();
      (data.users || []).forEach((user: any) => {
        userMap.set(user.id, user);
      });
      setUsers(userMap);
    } catch (error) {
      console.error('Error fetching users:', error);
    }
  };

  const formatDateTime = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleString('en-US', { 
      month: 'short', 
      day: 'numeric', 
      hour: 'numeric', 
      minute: '2-digit' 
    });
  };

  const getRecipientName = (recipientId: string) => {
    const user = users.get(recipientId);
    return user?.name || user?.email || 'Unknown';
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Scheduled Items</DialogTitle>
          <DialogDescription>
            View and manage your scheduled messages and calls
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="messages" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="messages">
              <MessageSquare className="w-4 h-4 mr-2" />
              Messages ({scheduledMessages.length})
            </TabsTrigger>
            <TabsTrigger value="calls">
              <Phone className="w-4 h-4 mr-2" />
              Calls ({scheduledCalls.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="messages">
            <ScrollArea className="h-96">
              {scheduledMessages.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                  <MessageSquare className="w-12 h-12 mx-auto mb-2 opacity-20" />
                  <p>No scheduled messages</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {scheduledMessages.map((message) => (
                    <div
                      key={message.id}
                      className="p-4 border rounded-lg space-y-2"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-sm">
                          To: {getRecipientName(message.recipientId)}
                        </span>
                        <Badge 
                          variant={message.status === 'pending' ? 'default' : 'secondary'}
                        >
                          {message.status}
                        </Badge>
                      </div>
                      <p className="text-sm text-gray-700">{message.content}</p>
                      <div className="flex items-center gap-1 text-xs text-gray-500">
                        <Clock className="w-3 h-3" />
                        {formatDateTime(message.scheduledTime)}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </TabsContent>

          <TabsContent value="calls">
            <ScrollArea className="h-96">
              {scheduledCalls.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                  <Phone className="w-12 h-12 mx-auto mb-2 opacity-20" />
                  <p>No scheduled calls</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {scheduledCalls.map((call) => (
                    <div
                      key={call.id}
                      className="p-4 border rounded-lg space-y-2"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-sm">
                          With: {getRecipientName(call.recipientId)}
                        </span>
                        <Badge 
                          variant={call.status === 'pending' ? 'default' : 'secondary'}
                        >
                          {call.status}
                        </Badge>
                      </div>
                      <p className="text-sm text-gray-600 capitalize">
                        {call.callType} call
                      </p>
                      <div className="flex items-center gap-1 text-xs text-gray-500">
                        <Clock className="w-3 h-3" />
                        {formatDateTime(call.scheduledTime)}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
