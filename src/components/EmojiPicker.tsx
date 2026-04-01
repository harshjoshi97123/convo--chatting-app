import { useState, useEffect, useMemo } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { ScrollArea } from './ui/scroll-area';
import { Search, Clock } from 'lucide-react';
import { Input } from './ui/input';
import { emojiData, emojiCategories } from '../utils/emojiData';
import { AppleEmoji } from './AppleEmoji';

interface EmojiPickerProps {
  onSelect: (emoji: string) => void;
}

const RECENT_EMOJIS_KEY = 'convo_recent_emojis';
const MAX_RECENT = 32;

export function EmojiPicker({ onSelect }: EmojiPickerProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('smileys');
  const [recentEmojis, setRecentEmojis] = useState<string[]>([]);

  useEffect(() => {
    const saved = localStorage.getItem(RECENT_EMOJIS_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setRecentEmojis(parsed);
          setActiveTab('recent'); // Default to recent
        }
      } catch (e) {
        console.error('Failed to parse recent emojis', e);
      }
    }
  }, []);

  const handleSelect = (emoji: string) => {
    onSelect(emoji);
    
    const newRecents = [emoji, ...recentEmojis.filter(e => e !== emoji)].slice(0, MAX_RECENT);
    setRecentEmojis(newRecents);
    try {
      localStorage.setItem(RECENT_EMOJIS_KEY, JSON.stringify(newRecents));
    } catch (e) {
      console.warn('LocalStorage limit reached for emojis');
    }
  };

  const filteredEmojis = useMemo(() => {
    if (!searchQuery) return null;
    const query = searchQuery.toLowerCase();
    return emojiData.filter(e => 
      e.name.toLowerCase().includes(query) || 
      e.keywords.some(k => k.toLowerCase().includes(query))
    );
  }, [searchQuery]);

  const categories = Object.entries(emojiCategories);

  return (
    <div className="w-[350px] h-[400px] bg-background border rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-in fade-in zoom-in duration-200 pb-2">
      <div className="p-3 border-b bg-muted/30">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search emojis..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 bg-background border-none shadow-inner h-9 rounded-full px-4"
            autoFocus
          />
        </div>
      </div>

      {searchQuery ? (
        <ScrollArea className="flex-1 px-2 pt-2">
          {filteredEmojis && filteredEmojis.length > 0 ? (
            <div className="grid grid-cols-7 gap-1">
              {filteredEmojis.map((emoji, index) => (
                <button
                  key={`search-${emoji.char}-${index}`}
                  onClick={() => handleSelect(emoji.char)}
                  className="text-2xl hover:bg-accent rounded-xl p-1.5 transition-all hover:scale-125 flex items-center justify-center aspect-square overflow-hidden"
                  title={emoji.name}
                >
                  <AppleEmoji emoji={emoji.char} size={28} />
                </button>
              ))}
            </div>
          ) : (
             <div className="h-full flex flex-col items-center justify-center text-muted-foreground py-10 mt-10">
              <span className="text-4xl mb-2">🔍</span>
              <p className="text-sm">No emojis found</p>
            </div>
          )}
        </ScrollArea>
      ) : (
        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col overflow-hidden mt-1">
          <TabsList className="w-full justify-start px-2 h-11 border-b rounded-none bg-transparent gap-1 overflow-x-auto no-scrollbar shrink-0 flex-nowrap">
            {categories.map(([key, category]) => (
              <TabsTrigger
                key={key}
                value={key}
                disabled={key === 'recent' && recentEmojis.length === 0}
                className="text-lg p-2 h-8 w-8 min-w-[32px] data-[state=active]:bg-accent data-[state=active]:shadow-sm rounded-lg transition-all flex-shrink-0"
                title={category.name}
              >
                {key === 'recent' ? <Clock className="w-4 h-4" /> : category.icon}
              </TabsTrigger>
            ))}
          </TabsList>

          {categories.map(([key, category]) => (
            <TabsContent key={key} value={key} className="m-0 flex-1 overflow-hidden data-[state=active]:flex flex-col">
              <ScrollArea className="flex-1 px-2 pt-2">
                <div className="grid grid-cols-7 gap-1 pb-4">
                  {key === 'recent' ? (
                    recentEmojis.map((emoji, index) => (
                      <button
                        key={`recent-${emoji}-${index}`}
                        onClick={() => handleSelect(emoji)}
                        className="text-2xl hover:bg-accent rounded-xl p-1.5 transition-all hover:scale-125 flex items-center justify-center aspect-square overflow-hidden"
                      >
                        <AppleEmoji emoji={emoji} size={28} />
                      </button>
                    ))
                  ) : (
                    emojiData
                      .filter(e => e.category === key)
                      .map((emoji, index) => (
                        <button
                          key={`${key}-${emoji.char}-${index}`}
                          onClick={() => handleSelect(emoji.char)}
                          className="text-2xl hover:bg-accent rounded-xl p-1.5 transition-all hover:scale-125 flex items-center justify-center aspect-square overflow-hidden"
                          title={emoji.name}
                        >
                          <AppleEmoji emoji={emoji.char} size={28} />
                        </button>
                      ))
                  )}
                </div>
              </ScrollArea>
            </TabsContent>
          ))}
        </Tabs>
      )}
    </div>
  );
}
