import { Image, FileText, BarChart, Presentation, Paperclip } from 'lucide-react';

export function getFileIcon(mimeType: string): React.JSX.Element {
  const iconSize = 16;

  if (mimeType.startsWith('image/')) return <Image size={iconSize} />;
  if (mimeType.includes('pdf')) return <FileText size={iconSize} />;
  if (mimeType.includes('word') || mimeType.includes('document')) return <FileText size={iconSize} />;
  if (mimeType.includes('sheet') || mimeType.includes('excel')) return <BarChart size={iconSize} />;
  if (mimeType.includes('presentation') || mimeType.includes('powerpoint')) return <Presentation size={iconSize} />;
  return <Paperclip size={iconSize} />;
}

export function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
}

export function getFileTypeLabel(mimeType: string): string {
  // Images
  if (mimeType === 'image/png') return 'PNG';
  if (mimeType === 'image/jpeg') return 'JPEG';
  if (mimeType === 'image/gif') return 'GIF';
  if (mimeType === 'image/webp') return 'WebP';
  if (mimeType.startsWith('image/')) return 'Image';

  // Documents
  if (mimeType === 'application/pdf') return 'PDF';
  if (mimeType.includes('wordprocessingml') || mimeType.includes('msword')) return 'Word';
  if (mimeType.includes('spreadsheetml') || mimeType.includes('excel')) return 'Excel';
  if (mimeType.includes('presentationml') || mimeType.includes('powerpoint')) return 'PowerPoint';

  // Text
  if (mimeType === 'text/plain') return 'Text';
  if (mimeType === 'text/csv') return 'CSV';
  if (mimeType.startsWith('text/')) return 'Text';

  // Fallback
  return 'File';
}
