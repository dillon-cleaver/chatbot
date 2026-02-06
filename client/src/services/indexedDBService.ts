import { openDB, type IDBPDatabase } from "idb";
import type { Conversation, Message, UploadedFile } from "../types";
import { generateUUID } from "../utils/uuid";

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
  role: "user" | "assistant";
  content: string;
  timestamp: number;
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

const DB_NAME = "chatbot-db";
const DB_VERSION = 2;

async function getDB(): Promise<IDBPDatabase> {
  return openDB(DB_NAME, DB_VERSION, {
    upgrade(db: IDBPDatabase) {
      // Create conversations store
      if (!db.objectStoreNames.contains("conversations")) {
        const conversationStore = db.createObjectStore("conversations", {
          keyPath: "id",
        });
        conversationStore.createIndex("updated_at", "updated_at");
      }

      // Create messages store
      if (!db.objectStoreNames.contains("messages")) {
        const messageStore = db.createObjectStore("messages", {
          keyPath: "id",
        });
        messageStore.createIndex("conversation_id", "conversation_id");
        messageStore.createIndex("timestamp", "timestamp");
      }

      // Create files store (IndexedDB-only; no server storage)
      if (!db.objectStoreNames.contains("files")) {
        db.createObjectStore("files", { keyPath: "id" });
      }
    },
  });
}

export async function createConversation(title: string): Promise<Conversation> {
  const db = await getDB();
  const now = Date.now();
  const conversation: ConversationDB = {
    id: generateUUID(),
    title,
    created_at: now,
    updated_at: now,
    message_count: 0,
  };

  await db.put("conversations", conversation);

  return {
    id: conversation.id,
    title: conversation.title,
    created_at: new Date(conversation.created_at).toISOString(),
    updated_at: new Date(conversation.updated_at).toISOString(),
    message_count: conversation.message_count,
  };
}

export async function addMessage(
  conversationId: string,
  role: "user" | "assistant",
  content: string
): Promise<Message> {
  const db = await getDB();
  const now = Date.now();

  // Create message
  const message: MessageDB = {
    id: generateUUID(),
    conversation_id: conversationId,
    role,
    content,
    timestamp: now,
  };

  await db.put("messages", message);

  // Update conversation
  const conversation = await db.get("conversations", conversationId);
  if (conversation) {
    conversation.updated_at = now;
    conversation.message_count = (conversation.message_count || 0) + 1;
    await db.put("conversations", conversation);
  }

  return {
    id: message.id,
    role: message.role,
    content: message.content,
  };
}

export async function loadConversation(conversationId: string): Promise<{
  id: string;
  title: string;
  messages: Message[];
  created_at: string;
  updated_at: string;
}> {
  const db = await getDB();

  // Get conversation
  const conversation = await db.get("conversations", conversationId);
  if (!conversation) {
    throw new Error("Conversation not found");
  }

  // Get messages
  const messages = await db.getAllFromIndex("messages", "conversation_id", conversationId);
  
  // Sort by timestamp
  messages.sort((a: MessageDB, b: MessageDB) => a.timestamp - b.timestamp);

  return {
    id: conversation.id,
    title: conversation.title,
    messages: messages.map((msg: MessageDB) => ({
      id: msg.id,
      role: msg.role,
      content: msg.content,
    })),
    created_at: new Date(conversation.created_at).toISOString(),
    updated_at: new Date(conversation.updated_at).toISOString(),
  };
}

export async function listConversations(): Promise<Conversation[]> {
  const db = await getDB();
  const conversations = await db.getAll("conversations");
  
  // Sort by updated_at descending
  conversations.sort((a: ConversationDB, b: ConversationDB) => b.updated_at - a.updated_at);

  return conversations.map((conv) => ({
    id: conv.id,
    title: conv.title,
    created_at: new Date(conv.created_at).toISOString(),
    updated_at: new Date(conv.updated_at).toISOString(),
    message_count: conv.message_count,
  }));
}

export async function deleteConversation(conversationId: string): Promise<void> {
  const db = await getDB();

  // Delete conversation
  await db.delete("conversations", conversationId);

  // Delete all messages for this conversation
  const messages = await db.getAllFromIndex("messages", "conversation_id", conversationId);
  for (const message of messages) {
    await db.delete("messages", message.id);
  }
}

export async function deleteAllConversations(): Promise<void> {
  const db = await getDB();
  await db.clear("conversations");
  await db.clear("messages");
}

export async function updateConversationTitle(
  conversationId: string,
  title: string
): Promise<void> {
  const db = await getDB();
  const conversation = await db.get("conversations", conversationId);

  if (!conversation) {
    throw new Error("Conversation not found");
  }

  conversation.title = title;
  conversation.updated_at = Date.now();
  await db.put("conversations", conversation);
}

// --- Files (IndexedDB-only; no server storage) ---

export async function addFile(
  originalName: string,
  mimeType: string,
  size: number,
  blob: Blob
): Promise<UploadedFile> {
  const db = await getDB();
  const id = generateUUID();
  const now = Date.now();
  const storedName = `${now}_${originalName.replace(/[^a-zA-Z0-9.-]/g, "_")}`;
  const file: FileDB = {
    id,
    original_name: originalName,
    stored_name: storedName,
    mime_type: mimeType,
    size,
    uploaded_at: now,
    blob,
  };
  await db.put("files", file);
  return {
    id,
    original_name: originalName,
    stored_name: storedName,
    mime_type: mimeType,
    size,
    uploaded_at: new Date(now).toISOString(),
    path: "",
  };
}

export async function listFiles(): Promise<UploadedFile[]> {
  const db = await getDB();
  const files = await db.getAll("files");
  files.sort((a: FileDB, b: FileDB) => b.uploaded_at - a.uploaded_at);
  return files.map((f: FileDB) => ({
    id: f.id,
    original_name: f.original_name,
    stored_name: f.stored_name,
    mime_type: f.mime_type,
    size: f.size,
    uploaded_at: new Date(f.uploaded_at).toISOString(),
    path: "",
  }));
}

export async function getFileBlob(fileId: string): Promise<{
  file: UploadedFile;
  blob: Blob;
}> {
  const db = await getDB();
  const row = await db.get("files", fileId);
  if (!row) {
    throw new Error("File not found");
  }
  const f = row as FileDB;
  return {
    file: {
      id: f.id,
      original_name: f.original_name,
      stored_name: f.stored_name,
      mime_type: f.mime_type,
      size: f.size,
      uploaded_at: new Date(f.uploaded_at).toISOString(),
      path: "",
    },
    blob: f.blob,
  };
}

export async function deleteFileById(fileId: string): Promise<void> {
  const db = await getDB();
  await db.delete("files", fileId);
}
