import { useState } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from './ui/dialog';
import { Hash, Check, Copy } from 'lucide-react';
import { toast } from 'sonner';

interface CreateRoomDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreateRoom: (roomInfo: any) => void;
}

export function CreateRoomDialog({
  open,
  onOpenChange,
  onCreateRoom,
}: CreateRoomDialogProps) {
  const [roomName, setRoomName] = useState('');
  const [roomDesc, setRoomDesc] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [generatedLink, setGeneratedLink] = useState('');
  const [copied, setCopied] = useState(false);

  const handleCreate = () => {
    if (!roomName.trim()) {
      toast.error('Please enter a room name');
      return;
    }

    setIsSubmitting(true);
    
    // Generate unique ID
    const uniqueId = Math.random().toString(36).substring(2, 9);
    
    // Simulate network delay
    setTimeout(() => {
      setIsSubmitting(false);
      
      const newRoom = {
        id: `room:${uniqueId}`,
        participantId: '',
        groupId: `room:${uniqueId}`,
        groupName: roomName.trim(),
        lastMessage: `Welcome to ${roomName.trim()}!`,
        lastMessageTime: new Date().toISOString(),
        unreadCount: 0,
        isRoom: true,
        memberCount: 1,
      };

      onCreateRoom(newRoom);
      setGeneratedLink(`convo.app/room/${uniqueId}`);
      toast.success('Room created successfully!');
    }, 600);
  };

  const copyToClipboard = () => {
    if (!generatedLink) return;
    navigator.clipboard.writeText(generatedLink);
    setCopied(true);
    toast.success('Link copied to clipboard');
    setTimeout(() => {
      setCopied(false);
      onOpenChange(false);
      setGeneratedLink('');
      setRoomName('');
      setRoomDesc('');
    }, 2000);
  };

  const handleClose = (open: boolean) => {
    if (!open) {
      setGeneratedLink('');
      setRoomName('');
      setRoomDesc('');
    }
    onOpenChange(open);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-center gap-2 text-xl font-bold">
            <Hash className="w-5 h-5 text-orange-500" />
            Create Room
          </DialogTitle>
          <DialogDescription className="text-center pt-2">
            Create an open source room and share the link with others.
          </DialogDescription>
        </DialogHeader>

        {!generatedLink ? (
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="room-name">Room Name</Label>
              <Input
                id="room-name"
                placeholder="e.g. Next.js Developers"
                value={roomName}
                onChange={(e) => setRoomName(e.target.value)}
                autoFocus
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="room-desc">Description (Optional)</Label>
              <Textarea
                id="room-desc"
                placeholder="What is this room about?"
                value={roomDesc}
                onChange={(e) => setRoomDesc(e.target.value)}
                rows={3}
              />
            </div>

            <Button 
              onClick={handleCreate} 
              className="w-full bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white"
              disabled={isSubmitting || !roomName.trim()}
            >
              {isSubmitting ? 'Creating...' : 'Generate Share Link'}
            </Button>
          </div>
        ) : (
          <div className="space-y-4 py-6 flex flex-col items-center">
            <div className="w-12 h-12 bg-green-100 dark:bg-green-900/30 text-green-600 rounded-full flex items-center justify-center mb-2">
              <Check className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-semibold">Room is Live!</h3>
            <p className="text-sm text-muted-foreground text-center mb-2">
              Share this link with anyone to invite them into the room:
            </p>
            
            <div className="flex items-center w-full gap-2">
              <Input
                readOnly
                value={generatedLink}
                className="font-mono text-sm bg-muted text-center"
              />
              <Button size="icon" variant="outline" onClick={copyToClipboard} className="shrink-0 bg-blue-50 hover:bg-blue-100 text-blue-600 border-blue-200">
                {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
