import { useState, useEffect } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Checkbox } from './ui/checkbox';
import { ScrollArea } from './ui/scroll-area';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from './ui/dialog';
import { Users } from 'lucide-react';
import { projectId } from '../utils/supabase/info';
import { toast } from 'sonner';

interface CreateGroupDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  accessToken: string;
  onGroupCreated: () => void;
}

export function CreateGroupDialog({ 
  open, 
  onOpenChange, 
  accessToken,
  onGroupCreated,
}: CreateGroupDialogProps) {
  const [groupName, setGroupName] = useState('');
  const [users, setUsers] = useState<any[]>([]);
  const [selectedUsers, setSelectedUsers] = useState<Set<string>>(new Set());
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (open) {
      fetchUsers();
    }
  }, [open]);

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
      setUsers(data.users || []);
    } catch (error) {
      console.error('Error fetching users:', error);
    }
  };

  const toggleUser = (userId: string) => {
    const newSelected = new Set(selectedUsers);
    if (newSelected.has(userId)) {
      newSelected.delete(userId);
    } else {
      newSelected.add(userId);
    }
    setSelectedUsers(newSelected);
  };

  const handleCreateGroup = async () => {
    if (!groupName.trim()) {
      toast.error('Please enter a group name');
      return;
    }

    if (selectedUsers.size === 0) {
      toast.error('Please select at least one member');
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-5b740c2f/groups`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${accessToken}`,
          },
          body: JSON.stringify({
            name: groupName,
            memberIds: Array.from(selectedUsers),
          }),
        }
      );

      if (!response.ok) {
        const error = await response.json();
        console.error('Failed to create group:', error);
        toast.error('Failed to create group');
        setIsSubmitting(false);
        return;
      }

      toast.success('Group created successfully');
      setGroupName('');
      setSelectedUsers(new Set());
      onOpenChange(false);
      onGroupCreated();
    } catch (error) {
      console.error('Error creating group:', error);
      toast.error('Failed to create group');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Create Group</DialogTitle>
          <DialogDescription>
            Create a new group chat with multiple members
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="group-name">Group Name</Label>
            <Input
              id="group-name"
              placeholder="Enter group name..."
              value={groupName}
              onChange={(e) => setGroupName(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label>Add Members ({selectedUsers.size} selected)</Label>
            <ScrollArea className="h-64 border rounded-lg p-2">
              {users.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <Users className="w-8 h-8 mx-auto mb-2 opacity-20" />
                  <p className="text-sm">No users available</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {users.map((user) => (
                    <div
                      key={user.id}
                      className="flex items-center space-x-3 p-2 rounded-lg hover:bg-muted/50 transition-colors group"
                    >
                      <Checkbox
                        id={user.id}
                        checked={selectedUsers.has(user.id)}
                        onCheckedChange={() => toggleUser(user.id)}
                      />
                      <label
                        htmlFor={user.id}
                        className="flex-1 cursor-pointer flex items-center gap-3"
                      >
                        <div className="relative">
                          <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 font-bold text-xs uppercase overflow-hidden">
                            {user.avatar ? <img src={user.avatar} className="w-full h-full object-cover" /> : user.name.slice(0, 1)}
                          </div>
                          <div className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-background ${
                            user.status === 'busy' ? 'bg-rose-500' : 
                            user.status === 'away' ? 'bg-amber-500' : 
                            user.status === 'offline' ? 'bg-slate-400' : 'bg-emerald-500'
                          }`} />
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-semibold truncate group-hover:text-indigo-600 transition-colors">{user.name}</p>
                          <p className="text-[10px] text-muted-foreground truncate opacity-70">
                            {user.statusText || user.email}
                          </p>
                        </div>
                      </label>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </div>

          <Button 
            onClick={handleCreateGroup} 
            className="w-full"
            disabled={isSubmitting}
          >
            {isSubmitting ? 'Creating...' : 'Create Group'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
