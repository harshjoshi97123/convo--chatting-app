import { Check, CheckCheck } from 'lucide-react';

interface MessageStatusIconProps {
  status: 'sent' | 'delivered' | 'read';
}

export function MessageStatusIcon({ status }: MessageStatusIconProps) {
  if (status === 'sent') {
    return <Check className="w-3.5 h-3.5" />;
  }
  if (status === 'delivered') {
    return <CheckCheck className="w-3.5 h-3.5" />;
  }
  if (status === 'read') {
    // Standard WhatsApp/Telegram blue ticks for read receipts
    return <CheckCheck className="w-3.5 h-3.5 text-blue-300 dark:text-blue-400" />;
  }
  return null;
}
