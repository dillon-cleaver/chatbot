/* eslint-disable react-refresh/only-export-components */
import { Image, FileText, BarChart, Presentation, Paperclip } from 'lucide-react';

export const FILE_ICON_SIZE = 16;

export const FILE_ICON_MAP: Record<string, React.JSX.Element> = {
  // Images
  'image/png': <Image size={FILE_ICON_SIZE} />,
  'image/jpeg': <Image size={FILE_ICON_SIZE} />,
  'image/jpg': <Image size={FILE_ICON_SIZE} />,
  'image/gif': <Image size={FILE_ICON_SIZE} />,
  'image/webp': <Image size={FILE_ICON_SIZE} />,
  // Documents
  'application/pdf': <FileText size={FILE_ICON_SIZE} />,
  'application/msword': <FileText size={FILE_ICON_SIZE} />,
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': <FileText size={FILE_ICON_SIZE} />,
  // Spreadsheets
  'application/vnd.ms-excel': <BarChart size={FILE_ICON_SIZE} />,
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': <BarChart size={FILE_ICON_SIZE} />,
  // Presentations
  'application/vnd.ms-powerpoint': <Presentation size={FILE_ICON_SIZE} />,
  'application/vnd.openxmlformats-officedocument.presentationml.presentation': <Presentation size={FILE_ICON_SIZE} />,
};

export const DEFAULT_FILE_ICON = <Paperclip size={FILE_ICON_SIZE} />;

export function getFileIcon(mimeType: string): React.JSX.Element {
  // Check exact match
  if (FILE_ICON_MAP[mimeType]) {
    return FILE_ICON_MAP[mimeType];
  }

  // Check prefix matches
  if (mimeType.startsWith('image/')) return <Image size={FILE_ICON_SIZE} />;
  if (mimeType.includes('pdf')) return <FileText size={FILE_ICON_SIZE} />;
  if (mimeType.includes('word') || mimeType.includes('document')) return <FileText size={FILE_ICON_SIZE} />;
  if (mimeType.includes('sheet') || mimeType.includes('excel')) return <BarChart size={FILE_ICON_SIZE} />;
  if (mimeType.includes('presentation') || mimeType.includes('powerpoint')) return <Presentation size={FILE_ICON_SIZE} />;

  return DEFAULT_FILE_ICON;
}

export const FILE_TYPE_LABELS: Record<string, string> = {
  // Images
  'image/png': 'PNG',
  'image/jpeg': 'JPEG',
  'image/jpg': 'JPEG',
  'image/gif': 'GIF',
  'image/webp': 'WebP',
  // Documents
  'application/pdf': 'PDF',
  'application/msword': 'Word',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'Word',
  // Spreadsheets
  'application/vnd.ms-excel': 'Excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'Excel',
  // Presentations
  'application/vnd.ms-powerpoint': 'PowerPoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation': 'PowerPoint',
  // Text
  'text/plain': 'Text',
  'text/csv': 'CSV',
};

export function getFileTypeLabel(mimeType: string): string {
  if (FILE_TYPE_LABELS[mimeType]) {
    return FILE_TYPE_LABELS[mimeType];
  }

  // Generic fallbacks
  if (mimeType.startsWith('image/')) return 'Image';
  if (mimeType.startsWith('text/')) return 'Text';

  return 'File';
}
