import { useState, useEffect } from 'react';
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
import { Settings2 } from 'lucide-react';
import { toast } from 'sonner';

interface StudyModeConfigDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: 'exam' | 'lecture';
  examSettings: { countdown: string; topics: string[] };
  lectureSettings: { summary: string };
  onSaveExam: (settings: { countdown: string; topics: string[] }) => void;
  onSaveLecture: (settings: { summary: string }) => void;
}

export function StudyModeConfigDialog({
  open,
  onOpenChange,
  mode,
  examSettings,
  lectureSettings,
  onSaveExam,
  onSaveLecture,
}: StudyModeConfigDialogProps) {
  // Exam state
  const [countdown, setCountdown] = useState(examSettings.countdown);
  const [topicsStr, setTopicsStr] = useState(examSettings.topics.join('\n'));
  
  // Lecture state
  const [summary, setSummary] = useState(lectureSettings.summary);

  useEffect(() => {
    if (open) {
      setCountdown(examSettings.countdown);
      setTopicsStr(examSettings.topics.join('\n'));
      setSummary(lectureSettings.summary);
    }
  }, [open, examSettings, lectureSettings]);

  const handleSave = () => {
    if (mode === 'exam') {
      const topics = topicsStr.split('\n').map(t => t.trim()).filter(Boolean);
      onSaveExam({ countdown, topics });
    } else {
      onSaveLecture({ summary });
    }
    toast.success(`${mode === 'exam' ? 'Exam' : 'Lecture'} configuration saved!`);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Settings2 className="w-5 h-5 text-blue-500" />
            Configure {mode === 'exam' ? 'Exam Mode' : 'Lecture Mode'}
          </DialogTitle>
          <DialogDescription>
            Customize the study materials and configurations for the room.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {mode === 'exam' && (
            <>
              <div className="space-y-2">
                <Label htmlFor="countdown">Deadline / Time Left</Label>
                <Input
                  id="countdown"
                  value={countdown}
                  onChange={(e) => setCountdown(e.target.value)}
                  placeholder="e.g. 14 Days Left"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="topics">Important Topics (one per line)</Label>
                <Textarea
                  id="topics"
                  value={topicsStr}
                  onChange={(e) => setTopicsStr(e.target.value)}
                  placeholder="Distributed Systems..."
                  rows={4}
                />
              </div>
            </>
          )}

          {mode === 'lecture' && (
            <div className="space-y-2">
              <Label htmlFor="summary">Class Summary & Notes</Label>
              <Textarea
                id="summary"
                value={summary}
                onChange={(e) => setSummary(e.target.value)}
                placeholder="Enter lecture summary here..."
                rows={5}
              />
            </div>
          )}

          <Button onClick={handleSave} className="w-full">
            Save Configuration
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
