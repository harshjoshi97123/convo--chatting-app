import { X, File, FileText, FileImage, FileVideo, FileAudio, Download } from 'lucide-react';
import { Button } from './ui/button';
import { motion } from 'motion/react';

interface FilePreviewProps {
  file: File;
  onRemove?: () => void;
  url?: string;
  showDownload?: boolean;
}

export function FilePreview({ file, onRemove, url, showDownload }: FilePreviewProps) {
  const getFileIcon = () => {
    if (file.type.startsWith('image/')) return FileImage;
    if (file.type.startsWith('video/')) return FileVideo;
    if (file.type.startsWith('audio/')) return FileAudio;
    if (file.type.includes('pdf') || file.type.includes('document')) return FileText;
    return File;
  };

  const Icon = getFileIcon();
  const isImage = file.type.startsWith('image/');
  const isVideo = file.type.startsWith('video/');
  const previewUrl = url || (isImage || isVideo ? URL.createObjectURL(file) : null);

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      className="relative group"
    >
      {isImage && previewUrl ? (
        <div className="relative w-32 h-32 rounded-lg overflow-hidden border">
          <img src={previewUrl} alt={file.name} className="w-full h-full object-cover" />
          {onRemove && (
            <Button
              size="icon"
              variant="destructive"
              className="absolute top-1 right-1 w-6 h-6 opacity-0 group-hover:opacity-100 transition-opacity"
              onClick={onRemove}
            >
              <X className="w-3 h-3" />
            </Button>
          )}
          {showDownload && (
            <a
              href={previewUrl}
              download={file.name}
              className="absolute bottom-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <Button size="icon" variant="secondary" className="w-6 h-6">
                <Download className="w-3 h-3" />
              </Button>
            </a>
          )}
        </div>
      ) : isVideo && previewUrl ? (
        <div className="relative w-48 h-32 rounded-lg overflow-hidden border">
          <video src={previewUrl} className="w-full h-full object-cover" />
          {onRemove && (
            <Button
              size="icon"
              variant="destructive"
              className="absolute top-1 right-1 w-6 h-6 opacity-0 group-hover:opacity-100 transition-opacity"
              onClick={onRemove}
            >
              <X className="w-3 h-3" />
            </Button>
          )}
        </div>
      ) : (
        <div className="flex items-center gap-3 p-3 border rounded-lg bg-muted/30 min-w-[200px]">
          <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
            <Icon className="w-5 h-5 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm truncate">{file.name}</p>
            <p className="text-xs text-muted-foreground">{formatFileSize(file.size)}</p>
          </div>
          {onRemove && (
            <Button
              size="icon"
              variant="ghost"
              className="w-6 h-6 shrink-0"
              onClick={onRemove}
            >
              <X className="w-3 h-3" />
            </Button>
          )}
          {showDownload && url && (
            <a href={url} download={file.name}>
              <Button size="icon" variant="ghost" className="w-6 h-6 shrink-0">
                <Download className="w-3 h-3" />
              </Button>
            </a>
          )}
        </div>
      )}
    </motion.div>
  );
}
