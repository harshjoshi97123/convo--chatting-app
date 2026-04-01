import React from 'react';
import { getEmojiHex, getAppleEmojiUrl } from '../utils/emojiUtils';
import { cn } from './ui/utils';

interface AppleEmojiProps {
  emoji: string;
  className?: string;
  size?: number;
}

export const AppleEmoji: React.FC<AppleEmojiProps> = ({ 
  emoji, 
  className,
  size = 20 
}) => {
  const hex = getEmojiHex(emoji);
  const url = getAppleEmojiUrl(hex);
  
  return (
    <img
      src={url}
      alt={emoji}
      className={cn("inline-block align-middle select-none", className)}
      style={{ width: size, height: size }}
      loading="lazy"
      onError={(e) => {
        // Fallback to native emoji if image fails to load
        const target = e.target as HTMLImageElement;
        target.outerHTML = `<span>${emoji}</span>`;
      }}
    />
  );
};
