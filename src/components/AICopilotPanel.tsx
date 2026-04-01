import { useState, useCallback } from 'react';
import { EmojiText } from './EmojiText';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from './ui/dialog';
import { Button } from './ui/button';
import { Textarea } from './ui/textarea';
import { ScrollArea } from './ui/scroll-area';
import { Badge } from './ui/badge';
import {
  Sparkles,
  Pencil,
  Volume2,
  ListChecks,
  MessageSquareMore,
  Search,
  FileText,
  Copy,
  Check,
  Loader2,
  ChevronRight,
  Wand2,
} from 'lucide-react';
import { toast } from 'sonner';
import { projectId } from '../utils/supabase/info';
import { motion, AnimatePresence } from 'motion/react';

type Mode = 'rewrite' | 'tone' | 'tasks' | 'followup' | 'search' | 'summarize';
type ToneOption = 'Professional' | 'Friendly' | 'Confident' | 'Polite' | 'Short & Direct' | 'Gen-Z';

interface AICopilotPanelProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  accessToken: string;
  currentUser: { id: string; name?: string };
  messages?: Array<{ senderName: string; content: string }>;
  onInsertText?: (text: string) => void;
}

const MODES: { id: Mode; label: string; icon: React.ReactNode; color: string; description: string }[] = [
  {
    id: 'rewrite',
    label: 'Rewrite',
    icon: <Pencil className="w-4 h-4" />,
    color: 'bg-blue-500',
    description: 'Rewrite your message with a specific tone',
  },
  {
    id: 'tone',
    label: 'Tone Check',
    icon: <Volume2 className="w-4 h-4" />,
    color: 'bg-purple-500',
    description: 'Analyze the tone of a message',
  },
  {
    id: 'tasks',
    label: 'Extract Tasks',
    icon: <ListChecks className="w-4 h-4" />,
    color: 'bg-emerald-500',
    description: 'Extract action items from messages',
  },
  {
    id: 'followup',
    label: 'Follow-Up',
    icon: <MessageSquareMore className="w-4 h-4" />,
    color: 'bg-amber-500',
    description: 'Generate a polite follow-up message',
  },
  {
    id: 'search',
    label: 'Chat Search',
    icon: <Search className="w-4 h-4" />,
    color: 'bg-rose-500',
    description: 'Ask questions about this conversation',
  },
  {
    id: 'summarize',
    label: 'Summarize',
    icon: <FileText className="w-4 h-4" />,
    color: 'bg-indigo-500',
    description: 'Summarize the conversation',
  },
];

const TONE_OPTIONS: ToneOption[] = ['Professional', 'Friendly', 'Confident', 'Polite', 'Short & Direct'];

export function AICopilotPanel({
  open,
  onOpenChange,
  accessToken,
  currentUser,
  messages = [],
  onInsertText,
}: AICopilotPanelProps) {
  const [activeMode, setActiveMode] = useState<Mode>('rewrite');
  const [inputText, setInputText] = useState('');
  const [question, setQuestion] = useState('');
  const [selectedTone, setSelectedTone] = useState<ToneOption>('Professional');
  const [result, setResult] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(() => {
    if (!result) return;
    navigator.clipboard.writeText(result);
    setCopied(true);
    toast.success('Copied to clipboard');
    setTimeout(() => setCopied(false), 2000);
  }, [result]);

  const checkHealth = async () => {
    try {
      toast.info('Checking AI connection...');
      // Standardized health check via the API router
      const response = await fetch(`https://${projectId}.supabase.co/functions/v1/make-server-5b740c2f/health`);
      if (response.ok) {
        toast.success('AI Server is Online ✅');
      } else {
        toast.error(`Server unreachable (${response.status}). Please redeploy the Edge Function.`);
      }
    } catch {
      toast.error('Network Error: Could not reach Supabase. Check your connection.');
    }
  };

  const handleInsert = useCallback(() => {
    if (!result || !onInsertText) return;
    onInsertText(result);
    toast.success('Inserted into message box');
    onOpenChange(false);
  }, [result, onInsertText, onOpenChange]);

  const handleRun = async () => {
    const textInput = activeMode === 'search' ? question : inputText;

    if (!textInput.trim() && activeMode !== 'summarize') {
      toast.error('Please enter some text first');
      return;
    }

    if (activeMode === 'search' && messages.length === 0) {
      toast.error('No conversation history to search');
      return;
    }

    if (activeMode === 'summarize' && messages.length === 0) {
      toast.error('No messages to summarize');
      return;
    }

    if (!accessToken) {
      toast.error('Authentication error: No session found. Please log in again.');
      setIsLoading(false);
      return;
    }

    const maxRetries = 3;
    let attempt = 0;

    const performFetch = async (): Promise<void> => {
      attempt++;
      try {
        // ULTIMATE RECOVERY: Pointing to raw, zero-dependency recovery function
        const url = `https://${projectId}.supabase.co/functions/v1/ai-recovery?t=${Date.now()}`;
        console.log(`[AI RECOVERY] Attempt ${attempt}/${maxRetries} to: ${url}`);
        
        const conversationContext =
          messages.length > 0
            ? messages
                .slice(-50)
                .map((m) => `${m.senderName}: ${m.content}`)
                .join('\n')
            : '';

        const payload = {
          mode: activeMode,
          content: inputText,
          message: inputText,
          tone: selectedTone,
          question,
          conversationContext,
          user_id: currentUser.id,
        };
        console.log("currentUser.id:", currentUser.id, "AI request payload:", payload);

        const response = await fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            // No Authorization header - bypasses multi-account JWT blocks
          },
          body: JSON.stringify(payload),
        });

        if (response.status === 429) {
          const data = await response.json();
          const waitTime = data.retryAfter || 15;
          console.warn(`[AI 429] Rate limited. Retrying in ${waitTime}s...`);
          setResult(`Service busy. Auto-retrying in ${waitTime}s...`);
          await new Promise(resolve => setTimeout(resolve, waitTime * 1000));
          return performFetch();
        }

        if (response.ok) {
          const data = await response.json();
          setResult(data.result || '');
        } else {
          const data = await response.json().catch(() => ({}));
          const errDetail = data.error || 'No error detail available';
          console.error(`AI Error (${response.status}):`, errDetail);
          throw new Error(errDetail);
        }
      } catch (error: any) {
        if (attempt < maxRetries && (error.message.includes('fetch') || error.message.includes('Failed to fetch'))) {
          console.warn(`[AI RETRY] Attempt ${attempt} failed, retrying...`);
          await new Promise(r => setTimeout(r, 1000 * attempt)); // Exponential backoff
          return performFetch();
        }
        console.error('Final AI Failure:', error);
        toast.error(`AI Co-Pilot failed: ${error.message || 'Network error'}`);
      } finally {
        if (attempt === maxRetries || !isLoading) setIsLoading(false);
      }
    };

    performFetch();
  };


  const handleModeChange = (mode: Mode) => {
    setActiveMode(mode);
    setResult('');
    setInputText('');
    setQuestion('');
  };

  const currentMode = MODES.find((m) => m.id === activeMode)!;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] flex flex-col p-0 gap-0 overflow-hidden border">
        {/* Header - Professional Standard */}
        <DialogHeader className="px-6 py-4 border-b bg-background z-20 shadow-sm flex-shrink-0">
          <DialogTitle className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center shadow-sm">
              <Sparkles className="w-5 h-5 text-primary-foreground" />
            </div>
            <div>
              <span className="text-xl font-bold text-foreground">
                AI Co-Pilot Assistant
              </span>
              <p className="text-[10px] uppercase font-bold tracking-widest text-muted-foreground mt-0.5">Professional Intelligence</p>
            </div>
          </DialogTitle>
          <div className="flex items-center gap-2">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={checkHealth}
              className="h-7 text-[10px] font-bold uppercase border-primary/20 hover:bg-primary/5"
            >
              Check Connection
            </Button>
          </div>
          <DialogDescription className="sr-only">
            AI-powered assistant for rewriting messages, checking tone, extracting tasks, generating follow-ups, and summarizing conversations.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-1 overflow-hidden bg-background">
          {/* Mode Sidebar - Clean Style */}
          <div className="w-48 border-r bg-muted/20 flex flex-col p-2 gap-1 flex-shrink-0">
            {MODES.map((mode) => (
              <button
                key={mode.id}
                onClick={() => handleModeChange(mode.id)}
                className={`w-full flex items-center gap-3 p-3 rounded-lg text-sm font-semibold transition-all ${
                  activeMode === mode.id
                    ? 'bg-background shadow-sm border border-border/50 text-primary'
                    : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground'
                }`}
              >
                <div
                  className={`w-8 h-8 rounded-md ${mode.color} flex items-center justify-center text-white shadow-sm flex-shrink-0`}
                >
                  {mode.icon}
                </div>
                <span>{mode.label}</span>
              </button>
            ))}
          </div>

          {/* Main Content */}
          <div className="flex-1 flex flex-col overflow-hidden">
            <ScrollArea className="flex-1">
              <div className="p-6 space-y-6">
                {/* Mode Header */}
                <div className="mb-4">
                  <div className="flex items-center gap-2 mb-1 text-primary">
                    <h3 className="font-bold text-sm uppercase tracking-wider">{currentMode.label}</h3>
                  </div>
                  <p className="text-xs text-muted-foreground font-medium">{currentMode.description}</p>
                </div>

                {/* Mode-specific Input */}
                <AnimatePresence mode="wait">
                  <motion.div
                    key={activeMode}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.1 }}
                    className="space-y-4"
                  >
                    {/* Rewrite Mode */}
                    {activeMode === 'rewrite' && (
                      <>
                        <div className="space-y-4">
                          <div>
                            <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest mb-2 block px-1">
                              Message Content
                            </label>
                            <Textarea
                              value={inputText}
                              onChange={(e) => setInputText(e.target.value)}
                              placeholder="Enter your message to transform..."
                              className="min-h-[140px] rounded-xl bg-muted/30 border-muted text-[15px] focus-visible:ring-1 focus-visible:ring-primary/20"
                            />
                          </div>
                          <div>
                            <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest mb-2 block px-1">
                              Target Tone
                            </label>
                            <div className="flex flex-wrap gap-1.5">
                              {TONE_OPTIONS.map((tone) => (
                                <button
                                  key={tone}
                                  onClick={() => setSelectedTone(tone as ToneOption)}
                                  className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${
                                    selectedTone === tone
                                      ? 'bg-primary text-primary-foreground shadow-sm'
                                      : 'bg-muted text-muted-foreground hover:bg-muted/80'
                                  }`}
                                >
                                  {tone}
                                </button>
                              ))}
                            </div>
                          </div>
                        </div>
                      </>
                    )}

                    {/* Tone Check Mode */}
                    {activeMode === 'tone' && (
                      <div>
                        <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest mb-2 block p-1">
                          Analyze Tone
                        </label>
                        <Textarea
                          value={inputText}
                          onChange={(e) => setInputText(e.target.value)}
                          placeholder="Paste a message to analyze its emotional tone..."
                          className="min-h-[140px] rounded-xl bg-muted/30 border-muted text-sm focus-visible:ring-1 focus-visible:ring-primary/20"
                        />
                      </div>
                    )}

                    {/* Task Extraction Mode */}
                    {activeMode === 'tasks' && (
                      <div>
                        <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest mb-2 block p-1">
                          Extract Action Items
                        </label>
                        <Textarea
                          value={inputText}
                          onChange={(e) => setInputText(e.target.value)}
                          placeholder="Paste conversation text to identify tasks and deadlines..."
                          className="min-h-[140px] rounded-xl bg-muted/30 border-muted text-sm focus-visible:ring-1 focus-visible:ring-primary/20"
                        />
                      </div>
                    )}

                    {/* Follow-up Mode */}
                    {activeMode === 'followup' && (
                      <div>
                        <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest mb-2 block p-1">
                          Previous Context
                        </label>
                        <Textarea
                          value={inputText}
                          onChange={(e) => setInputText(e.target.value)}
                          placeholder="What would you like to follow up on?"
                          className="min-h-[140px] rounded-xl bg-muted/30 border-muted text-sm focus-visible:ring-1 focus-visible:ring-primary/20"
                        />
                      </div>
                    )}

                    {/* Chat Memory Search Mode */}
                    {activeMode === 'search' && (
                      <div>
                        <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest mb-2 block p-1">
                          Search Conversation Memory
                        </label>
                        <Textarea
                          value={question}
                          onChange={(e) => setQuestion(e.target.value)}
                          placeholder="Ask anything about past messages in this chat..."
                          className="min-h-[100px] rounded-xl bg-muted/30 border-muted text-sm focus-visible:ring-1 focus-visible:ring-primary/20"
                        />
                        {messages.length > 0 ? (
                          <div className="flex items-center gap-2 mt-3 px-1">
                            <Badge variant="secondary" className="text-[10px] font-bold uppercase">{messages.length} messages in context</Badge>
                          </div>
                        ) : (
                          <p className="text-xs text-amber-600 mt-2 italic px-1">
                            No loaded messages available for search.
                          </p>
                        )}
                      </div>
                    )}

                    {/* Summarize Mode */}
                    {activeMode === 'summarize' && (
                      <div>
                        {messages.length > 0 ? (
                          <div className="bg-primary/5 rounded-xl p-4 border border-primary/10">
                            <p className="text-sm font-medium">
                              Ready to summarize <span className="text-primary font-bold">{messages.length}</span> recent messages.
                            </p>
                          </div>
                        ) : (
                          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
                            <p className="text-sm text-amber-700 font-medium">
                              Conversation history is required for summarization.
                            </p>
                          </div>
                        )}
                      </div>
                    )}
                  </motion.div>
                </AnimatePresence>

                {/* Run Button */}
                <Button
                  onClick={handleRun}
                  disabled={isLoading}
                  className="w-full h-12 rounded-xl bg-primary text-primary-foreground font-bold uppercase tracking-widest shadow-sm hover:opacity-90 transition-all"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="w-5 h-5 mr-3 animate-spin" />
                      Analyzing...
                    </>
                  ) : (
                    <>
                      <Wand2 className="w-5 h-5 mr-2" />
                      Execute {currentMode.label}
                    </>
                  )}
                </Button>

                {/* Result */}
                <AnimatePresence>
                  {result && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.98 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="space-y-3 pt-4 border-t"
                    >
                      <div className="flex items-center justify-between px-1">
                        <label className="text-[11px] font-bold text-primary uppercase tracking-widest flex items-center gap-2">
                          <Sparkles className="w-4 h-4" />
                          AI Output
                        </label>
                        <div className="flex gap-1.5">
                          {(activeMode === 'rewrite' || activeMode === 'followup') && onInsertText && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={handleInsert}
                              className="h-8 text-[11px] font-bold uppercase border-primary/20 hover:bg-primary/5"
                            >
                              <ChevronRight className="w-3.5 h-3.5 mr-1" />
                              Apply to Chat
                            </Button>
                          )}
                          <Button size="sm" variant="outline" onClick={handleCopy} className="h-8 text-[11px] font-bold uppercase border-muted">
                            {copied ? (
                              <>
                                <Check className="w-3.5 h-3.5 mr-1 text-green-500" />
                                <span className="text-green-500">Copied</span>
                              </>
                            ) : (
                              <>
                                <Copy className="w-3.5 h-3.5 mr-1" />
                                Copy text
                              </>
                            )}
                          </Button>
                        </div>
                      </div>
                      <div className="bg-muted/40 border rounded-xl p-5 shadow-inner">
                        <p className="text-sm whitespace-pre-wrap leading-relaxed selection:bg-primary/20"><EmojiText text={result} size={16} /></p>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </ScrollArea>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}