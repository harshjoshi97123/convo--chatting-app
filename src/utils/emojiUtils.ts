/**
 * Utility to convert an emoji character to its hex equivalent
 * suitable for fetching images from the Apple Emoji CDN.
 */
export function getEmojiHex(emoji: string): string {
  const codePoints = Array.from(emoji).map((char) => 
    char.codePointAt(0)!.toString(16)
  );
  
  // Filter out variation selectors (like \uFE0F) which CDNs often omit
  return codePoints.filter(cp => cp !== 'fe0f').join('-');
}

/**
 * Gets the URL for an Apple Emoji image
 */
export function getAppleEmojiUrl(emojiPoint: string): string {
  // Using a reliable CDN for Apple Emojis
  return `https://cdn.jsdelivr.net/npm/emoji-datasource-apple/img/apple/64/${emojiPoint}.png`;
}
