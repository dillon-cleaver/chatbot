import { openDB, type IDBPDatabase } from 'idb';
import type { Conversation, ConversationDetail, Message, TokenUsage, UploadedFile } from '../types';
import { generateUUID } from '../utils/uuid';

// Internal DB types — epoch ms timestamps, converted to ISO strings in return values
interface ConversationDB {
  id: string;
  title: string;
  created_at: number;
  updated_at: number;
  message_count: number;
}

interface MessageDB {
  id: string;
  conversation_id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
  file_ids?: string[];
  usage?: TokenUsage;
}

interface FileDB {
  id: string;
  original_name: string;
  stored_name: string;
  mime_type: string;
  size: number;
  uploaded_at: number;
  blob: Blob;
}

interface ChatbotDBSchema {
  conversations: {
    key: string;
    value: ConversationDB;
    indexes: { updated_at: number };
  };
  messages: {
    key: string;
    value: MessageDB;
    indexes: { conversation_id: string; timestamp: number };
  };
  files: {
    key: string;
    value: FileDB;
  };
}

const DB_NAME = 'chatbot-db';
const DB_VERSION = 2;

let dbPromise: Promise<IDBPDatabase<ChatbotDBSchema>> | null = null;

function getDB(): Promise<IDBPDatabase<ChatbotDBSchema>> {
  if (!dbPromise) {
    dbPromise = openDB<ChatbotDBSchema>(DB_NAME, DB_VERSION, {
      upgrade(db, oldVersion) {
        if (oldVersion < 1) {
          const convStore = db.createObjectStore('conversations', { keyPath: 'id' });
          convStore.createIndex('updated_at', 'updated_at');

          const msgStore = db.createObjectStore('messages', { keyPath: 'id' });
          msgStore.createIndex('conversation_id', 'conversation_id');
          msgStore.createIndex('timestamp', 'timestamp');

          db.createObjectStore('files', { keyPath: 'id' });
        }
        // V2 placeholder for future migrations
      },
    });
  }
  return dbPromise;
}

// --- Conversations ---

export async function createConversation(title: string): Promise<Conversation> {
  const db = await getDB();
  const now = Date.now();
  const conv: ConversationDB = {
    id: generateUUID(),
    title,
    created_at: now,
    updated_at: now,
    message_count: 0,
  };
  await db.put('conversations', conv);
  return {
    id: conv.id,
    title: conv.title,
    created_at: new Date(conv.created_at).toISOString(),
    updated_at: new Date(conv.updated_at).toISOString(),
    message_count: conv.message_count,
  };
}

export async function addMessage(
  conversationId: string,
  role: 'user' | 'assistant',
  content: string,
  fileIds?: string[],
  usage?: TokenUsage,
): Promise<Message> {
  const db = await getDB();
  const now = Date.now();
  const msg: MessageDB = {
    id: generateUUID(),
    conversation_id: conversationId,
    role,
    content,
    timestamp: now,
    ...(fileIds && fileIds.length > 0 ? { file_ids: fileIds } : {}),
    ...(usage ? { usage } : {}),
  };
  const tx = db.transaction(['messages', 'conversations'], 'readwrite');
  await tx.objectStore('messages').put(msg);

  const conv = await tx.objectStore('conversations').get(conversationId);
  if (conv) {
    conv.message_count += 1;
    conv.updated_at = now;
    await tx.objectStore('conversations').put(conv);
  }
  await tx.done;

  return {
    id: msg.id,
    role: msg.role,
    content: msg.content,
  };
}

export async function loadConversation(conversationId: string): Promise<ConversationDetail> {
  const db = await getDB();
  const conv = await db.get('conversations', conversationId);
  if (!conv) {
    throw new Error('Conversation not found');
  }

  const allMessages = await db.getAllFromIndex('messages', 'conversation_id', conversationId);
  allMessages.sort((a, b) => a.timestamp - b.timestamp);

  // Look up file metadata for messages that have file_ids
  const messages: Message[] = [];
  for (const m of allMessages) {
    let files: UploadedFile[] | undefined;
    if (m.file_ids && m.file_ids.length > 0) {
      const fileResults = await Promise.all(
        m.file_ids.map((fid: string) => db.get('files', fid)),
      );
      const found = fileResults.filter(
        (f): f is FileDB => f !== undefined,
      );
      if (found.length > 0) {
        files = found.map((f) => ({
          id: f.id,
          original_name: f.original_name,
          stored_name: f.stored_name,
          mime_type: f.mime_type,
          size: f.size,
          uploaded_at: new Date(f.uploaded_at).toISOString(),
        }));
      }
    }
    messages.push({
      id: m.id,
      role: m.role,
      content: m.content,
      ...(files ? { files } : {}),
      ...(m.usage ? { usage: m.usage } : {}),
    });
  }

  return {
    id: conv.id,
    title: conv.title,
    messages,
    created_at: new Date(conv.created_at).toISOString(),
    updated_at: new Date(conv.updated_at).toISOString(),
  };
}

export async function listConversations(): Promise<Conversation[]> {
  const db = await getDB();
  const all = await db.getAll('conversations');
  all.sort((a, b) => b.updated_at - a.updated_at);
  return all.map((c) => ({
    id: c.id,
    title: c.title,
    created_at: new Date(c.created_at).toISOString(),
    updated_at: new Date(c.updated_at).toISOString(),
    message_count: c.message_count,
  }));
}

export async function deleteConversation(conversationId: string): Promise<void> {
  const db = await getDB();
  const tx = db.transaction(['conversations', 'messages'], 'readwrite');

  // Delete all messages for this conversation
  const msgIndex = tx.objectStore('messages').index('conversation_id');
  let cursor = await msgIndex.openCursor(conversationId);
  while (cursor) {
    await cursor.delete();
    cursor = await cursor.continue();
  }

  await tx.objectStore('conversations').delete(conversationId);
  await tx.done;
}

export async function deleteAllConversations(): Promise<void> {
  const db = await getDB();
  const tx = db.transaction(['conversations', 'messages'], 'readwrite');
  await tx.objectStore('conversations').clear();
  await tx.objectStore('messages').clear();
  await tx.done;
}

export async function updateConversationTitle(
  conversationId: string,
  title: string,
): Promise<void> {
  const db = await getDB();
  const conv = await db.get('conversations', conversationId);
  if (!conv) return;
  conv.title = title;
  conv.updated_at = Date.now();
  await db.put('conversations', conv);
}

// --- Files ---

export async function addFile(
  originalName: string,
  mimeType: string,
  size: number,
  blob: Blob,
): Promise<UploadedFile> {
  const db = await getDB();
  const now = Date.now();
  const sanitized = originalName.replace(/[^a-zA-Z0-9.-]/g, '_');
  const file: FileDB = {
    id: generateUUID(),
    original_name: originalName,
    stored_name: `${now}_${sanitized}`,
    mime_type: mimeType,
    size,
    uploaded_at: now,
    blob,
  };
  await db.put('files', file);
  return {
    id: file.id,
    original_name: file.original_name,
    stored_name: file.stored_name,
    mime_type: file.mime_type,
    size: file.size,
    uploaded_at: new Date(file.uploaded_at).toISOString(),
  };
}

export async function listFiles(): Promise<UploadedFile[]> {
  const db = await getDB();
  const all = await db.getAll('files');
  all.sort((a, b) => b.uploaded_at - a.uploaded_at);
  return all.map((f) => ({
    id: f.id,
    original_name: f.original_name,
    stored_name: f.stored_name,
    mime_type: f.mime_type,
    size: f.size,
    uploaded_at: new Date(f.uploaded_at).toISOString(),
  }));
}

export async function getFileBlob(
  fileId: string,
): Promise<{ file: UploadedFile; blob: Blob }> {
  const db = await getDB();
  const f = await db.get('files', fileId);
  if (!f) {
    throw new Error('File not found');
  }
  return {
    file: {
      id: f.id,
      original_name: f.original_name,
      stored_name: f.stored_name,
      mime_type: f.mime_type,
      size: f.size,
      uploaded_at: new Date(f.uploaded_at).toISOString(),
    },
    blob: f.blob,
  };
}

export async function deleteFileById(fileId: string): Promise<void> {
  const db = await getDB();
  await db.delete('files', fileId);
}
