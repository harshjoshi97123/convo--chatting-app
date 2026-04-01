import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Calendar as CalendarIcon, Phone, MessageSquare, Video } from 'lucide-react';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from './ui/dialog';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';

interface ScheduleDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultTab?: 'message' | 'call';
  onSubmit?: (data: any) => void;
}

export function ScheduleDialog({ 
  open, 
  onOpenChange, 
  defaultTab = 'message',
  onSubmit,
}: ScheduleDialogProps) {
  const [messageContent, setMessageContent] = useState('');
  const [messageDateTime, setMessageDateTime] = useState('');
  const [callDateTime, setCallDateTime] = useState('');
  const [callType, setCallType] = useState<'voice' | 'video'>('voice');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleScheduleMessage = async () => {
    if (!messageContent.trim() || !messageDateTime) {
      toast.error('Please fill in all fields');
      return;
    }

    if (onSubmit) {
      onSubmit({
        message: messageContent,
        scheduledTime: new Date(messageDateTime).toISOString(),
      });
      setMessageContent('');
      setMessageDateTime('');
    }
  };

  const handleScheduleCall = async () => {
    if (!callDateTime) {
      toast.error('Please select date and time');
      return;
    }

    if (onSubmit) {
      onSubmit({
        callType,
        scheduledTime: new Date(callDateTime).toISOString(),
      });
      setCallDateTime('');
    }
  };

  const getMinDateTime = () => {
    const now = new Date();
    now.setMinutes(now.getMinutes() + 1);
    return now.toISOString().slice(0, 16);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Schedule Communication</DialogTitle>
          <DialogDescription>
            Schedule a message or call for future delivery
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue={defaultTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="message">
              <MessageSquare className="w-4 h-4 mr-2" />
              Message
            </TabsTrigger>
            <TabsTrigger value="call">
              <Phone className="w-4 h-4 mr-2" />
              Call
            </TabsTrigger>
          </TabsList>

          <TabsContent value="message" className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label htmlFor="message-content">Message</Label>
              <Textarea
                id="message-content"
                placeholder="Type your message..."
                value={messageContent}
                onChange={(e) => setMessageContent(e.target.value)}
                rows={4}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="message-datetime">Schedule Date & Time</Label>
              <Input
                id="message-datetime"
                type="datetime-local"
                value={messageDateTime}
                onChange={(e) => setMessageDateTime(e.target.value)}
                min={getMinDateTime()}
              />
            </div>

            <Button 
              onClick={handleScheduleMessage} 
              className="w-full"
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Scheduling...' : 'Schedule Message'}
            </Button>
          </TabsContent>

          <TabsContent value="call" className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label>Call Type</Label>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant={callType === 'voice' ? 'default' : 'outline'}
                  onClick={() => setCallType('voice')}
                  className="flex-1"
                >
                  <Phone className="w-4 h-4 mr-2" />
                  Voice
                </Button>
                <Button
                  type="button"
                  variant={callType === 'video' ? 'default' : 'outline'}
                  onClick={() => setCallType('video')}
                  className="flex-1"
                >
                  <Video className="w-4 h-4 mr-2" />
                  Video
                </Button>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="call-datetime">Schedule Date & Time</Label>
              <Input
                id="call-datetime"
                type="datetime-local"
                value={callDateTime}
                onChange={(e) => setCallDateTime(e.target.value)}
                min={getMinDateTime()}
              />
            </div>

            <Button 
              onClick={handleScheduleCall} 
              className="w-full"
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Scheduling...' : 'Schedule Call'}
            </Button>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}