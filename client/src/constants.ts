export const API_BASE_URL = 'http://localhost:3000';
export const MAX_FILES_PER_MESSAGE = 5;
export const MAX_TOTAL_FILES = 25;
export const MAX_CONVERSATIONS = 50;
export const MAX_DAILY_CHATS = 5;
export const MAX_STORAGE_BYTES = 100 * 1024 * 1024; // 100 MB

export const ACCEPTED_EXTENSIONS = new Set([
  '.pdf', '.docx', '.xlsx', '.pptx',
  '.png', '.jpg', '.jpeg', '.gif', '.webp',
  '.txt', '.csv',
]);

export const ACCEPTED_MIME_TYPES = new Set([
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'image/png', 'image/jpeg', 'image/gif', 'image/webp',
  'text/plain', 'text/csv',
]);
