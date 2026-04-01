import React, { useMemo } from 'react';
import { AppleEmoji } from './AppleEmoji';

interface EmojiTextProps {
  text: string;
  size?: number;
  className?: string;
}

export const EmojiText: React.FC<EmojiTextProps> = ({ 
  text, 
  size = 20,
  className 
}) => {
  // Regex to match emojis
  const emojiRegex = /[\u{1f300}-\u{1f5ff}\u{1f600}-\u{1f64f}\u{1f680}-\u{1f6ff}\u{1f700}-\u{1f77f}\u{1f780}-\u{1f7ff}\u{1f900}-\u{1f9ff}\u{1fa00}-\u{1faff}\u{2600}-\u{26ff}\u{2700}-\u{27bf}][\u{fe00}-\u{fe0f}]?|[\u{1f1e6}-\u{1f1ff}]{2}/gu;
  
  const segments = useMemo(() => {
    const safeText = text || '';
    const parts = safeText.split(emojiRegex);
    const emojis = safeText.match(emojiRegex) || [];
    return { parts, emojis };
  }, [text]);

  
  return (
    <span className={className}>
      {segments.parts.map((part, i) => (
        <React.Fragment key={i}>
          {part}
          {segments.emojis[i] && (
            <AppleEmoji 
              emoji={segments.emojis[i]} 
              size={size} 
              className="mx-0.5 inline-block" 
            />
          )}
        </React.Fragment>
      ))}
    </span>
  );
};
