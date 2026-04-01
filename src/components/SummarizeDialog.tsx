import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from './ui/dialog';
import { Button } from './ui/button';
import { ScrollArea } from './ui/scroll-area';
import { Loader2, Copy, Check, Sparkles } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';

interface SummarizeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  summary: string;
  isLoading: boolean;
  originalContent?: string;
}

export function SummarizeDialog({ 
  open, 
  onOpenChange, 
  summary, 
  isLoading,
  originalContent 
}: SummarizeDialogProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(summary);
    setCopied(true);
    toast.success('Summary copied to clipboard');
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-blue-500" />
            AI Summary
          </DialogTitle>
          <DialogDescription className="sr-only">
            AI-generated summary of the selected message or conversation.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-hidden flex flex-col gap-4">
          {isLoading ? (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center space-y-3">
                <Loader2 className="w-8 h-8 animate-spin text-blue-500 mx-auto" />
                <p className="text-sm text-muted-foreground">
                  Generating summary...
                </p>
              </div>
            </div>
          ) : (
            <>
              {/* Summary Section */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium text-foreground">
                    Summary
                  </label>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={handleCopy}
                    className="h-8 gap-2"
                  >
                    {copied ? (
                      <>
                        <Check className="w-4 h-4 text-green-500" />
                        <span className="text-green-500">Copied</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-4 h-4" />
                        Copy
                      </>
                    )}
                  </Button>
                </div>
                <ScrollArea className="h-[200px] rounded-lg border bg-muted/30 p-4">
                  <div className="text-sm text-foreground whitespace-pre-wrap">
                    {summary}
                  </div>
                </ScrollArea>
              </div>

              {/* Original Content Section (if available) */}
              {originalContent && (
                <div className="space-y-2">
                  <label className="text-sm font-medium text-muted-foreground">
                    Original Message
                  </label>
                  <ScrollArea className="h-[150px] rounded-lg border bg-background p-4">
                    <div className="text-sm text-muted-foreground whitespace-pre-wrap">
                      {originalContent}
                    </div>
                  </ScrollArea>
                </div>
              )}
            </>
          )}
        </div>

        <div className="flex justify-end">
          <Button onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}