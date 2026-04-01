import { useState } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from './ui/dialog';
import { Hash } from 'lucide-react';
import { toast } from 'sonner';

interface JoinRoomDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onJoinRoom: (roomId: string) => Promise<boolean> | boolean;
}

export function JoinRoomDialog({
  open,
  onOpenChange,
  onJoinRoom,
}: JoinRoomDialogProps) {
  const [roomInput, setRoomInput] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleJoin = async () => {
    if (!roomInput.trim()) {
      toast.error('Please enter a room link or ID');
      return;
    }

    setIsSubmitting(true);
    
    let roomId = roomInput.trim();
    
    if (roomId.includes('join=')) {
      // Handle full URL with query param: http://localhost:3000?join=room:xyz
      try {
        const urlStr = roomId.includes('://') ? roomId : `http://${roomId}`;
        const url = new URL(urlStr);
        roomId = url.searchParams.get('join') || roomId;
      } catch (e) {
        roomId = roomId.split('join=')[1] || roomId;
      }
    } else if (roomId.includes('/')) {
      // Handle path-based URL: convo.app/r/room:xyz
      const parts = roomId.split('/');
      roomId = parts[parts.length - 1];
    }

    const success = await onJoinRoom(roomId);
    setIsSubmitting(false);
    
    if (success) {
      toast.success('Successfully joined the room!');
      setRoomInput('');
      onOpenChange(false);
    } else {
      toast.error('Room not found! Invalid link or ID.');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-center gap-2 text-xl font-bold">
            <Hash className="w-5 h-5 text-orange-500" />
            Join Room
          </DialogTitle>
          <DialogDescription className="text-center pt-2">
            Enter an open source room link or ID to join the community space.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="room-link">Room Link or ID</Label>
            <Input
              id="room-link"
              placeholder="e.g. convo.app/r/react-devs or react-devs"
              value={roomInput}
              onChange={(e) => setRoomInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleJoin();
              }}
              className="font-mono text-sm"
              autoFocus
            />
          </div>

          <Button 
            onClick={handleJoin} 
            className="w-full bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white"
            disabled={isSubmitting || !roomInput.trim()}
          >
            {isSubmitting ? 'Joining...' : 'Launch Room'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
