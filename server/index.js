import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import Anthropic from '@anthropic-ai/sdk';
import Database from 'better-sqlite3';
import multer from 'multer';
import { v4 as uuidv4 } from 'uuid';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { processFile } from './fileProcessor.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

// Initialize SQLite database
const db = new Database('database.db');

// Create files table
db.exec(`
  CREATE TABLE IF NOT EXISTS files (
    id TEXT PRIMARY KEY,
    original_name TEXT NOT NULL,
    stored_name TEXT NOT NULL,
    mime_type TEXT NOT NULL,
    size INTEGER NOT NULL,
    uploaded_at TEXT NOT NULL,
    path TEXT NOT NULL
  )
`);

// Create conversations table
db.exec(`
  CREATE TABLE IF NOT EXISTS conversations (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    message_count INTEGER DEFAULT 0
  )
`);

// Create messages table
db.exec(`
  CREATE TABLE IF NOT EXISTS messages (
    id TEXT PRIMARY KEY,
    conversation_id TEXT NOT NULL,
    role TEXT NOT NULL,
    content TEXT NOT NULL,
    created_at TEXT NOT NULL,
    file_ids TEXT,
    FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE
  )
`);

// Create uploads directory if it doesn't exist
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    const sanitizedName = file.originalname.replace(/[^a-zA-Z0-9.-]/g, '_');
    const filename = `${Date.now()}_${sanitizedName}`;
    cb(null, filename);
  },
});

const allowedMimeTypes = [
  'application/pdf',
  'image/png',
  'image/jpeg',
  'image/gif',
  'image/webp',
  'text/plain',
  'text/csv',
  // Note: Only .docx is supported, not legacy .doc format
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
];

const upload = multer({
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB per file
    files: 20 // Maximum 20 files per upload
  },
  fileFilter: (req, file, cb) => {
    if (allowedMimeTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      // Provide helpful error message for legacy Office formats
      if (file.mimetype === 'application/msword') {
        cb(new Error('Legacy .doc files are not supported. Please convert to .docx format.'), false);
      } else if (file.mimetype === 'application/vnd.ms-excel') {
        cb(new Error('Legacy .xls files are not supported. Please convert to .xlsx format.'), false);
      } else if (file.mimetype === 'application/vnd.ms-powerpoint') {
        cb(new Error('Legacy .ppt files are not supported. Please convert to .pptx format.'), false);
      } else {
        cb(new Error(`File type not supported: ${file.mimetype}`), false);
      }
    }
  },
});

// Conversation endpoints

// Get all conversations
app.get('/conversations', (req, res) => {
  try {
    const conversations = db.prepare(`
      SELECT * FROM conversations
      ORDER BY updated_at DESC
    `).all();

    res.json(conversations);
  } catch (error) {
    console.error('Error fetching conversations:', error);
    res.status(500).json({ error: 'Failed to fetch conversations' });
  }
});

// Get specific conversation with messages
app.get('/conversations/:id', (req, res) => {
  try {
    const { id } = req.params;

    // Get conversation metadata
    const conversation = db.prepare('SELECT * FROM conversations WHERE id = ?').get(id);

    if (!conversation) {
      return res.status(404).json({ error: 'Conversation not found' });
    }

    // Get all messages for this conversation
    const messages = db.prepare(`
      SELECT * FROM messages
      WHERE conversation_id = ?
      ORDER BY created_at ASC
    `).all(id);

    res.json({
      ...conversation,
      messages: messages.map(msg => ({
        id: msg.id,
        role: msg.role,
        content: msg.content,
        created_at: msg.created_at,
        file_ids: msg.file_ids ? JSON.parse(msg.file_ids) : []
      }))
    });
  } catch (error) {
    console.error('Error fetching conversation:', error);
    res.status(500).json({ error: 'Failed to fetch conversation' });
  }
});

// Create new conversation
app.post('/conversations', (req, res) => {
  try {
    const { title } = req.body;

    const id = uuidv4();
    const now = new Date().toISOString();

    db.prepare(`
      INSERT INTO conversations (id, title, created_at, updated_at, message_count)
      VALUES (?, ?, ?, ?, 0)
    `).run(id, title || 'New Conversation', now, now);

    res.json({
      id,
      title: title || 'New Conversation',
      created_at: now,
      updated_at: now,
      message_count: 0
    });
  } catch (error) {
    console.error('Error creating conversation:', error);
    res.status(500).json({ error: 'Failed to create conversation' });
  }
});

// Update conversation title
app.patch('/conversations/:id', (req, res) => {
  try {
    const { id } = req.params;
    const { title } = req.body;

    if (!title || !title.trim()) {
      return res.status(400).json({ error: 'Title is required' });
    }

    const conversation = db.prepare('SELECT * FROM conversations WHERE id = ?').get(id);

    if (!conversation) {
      return res.status(404).json({ error: 'Conversation not found' });
    }

    db.prepare(`
      UPDATE conversations
      SET title = ?, updated_at = ?
      WHERE id = ?
    `).run(title.trim(), new Date().toISOString(), id);

    res.json({ success: true, title: title.trim() });
  } catch (error) {
    console.error('Error updating conversation:', error);
    res.status(500).json({ error: 'Failed to update conversation' });
  }
});

// Delete specific conversation
app.delete('/conversations/:id', (req, res) => {
  try {
    const { id } = req.params;

    const conversation = db.prepare('SELECT * FROM conversations WHERE id = ?').get(id);

    if (!conversation) {
      return res.status(404).json({ error: 'Conversation not found' });
    }

    // Delete messages (cascade should handle this, but explicit is safer)
    db.prepare('DELETE FROM messages WHERE conversation_id = ?').run(id);

    // Delete conversation
    db.prepare('DELETE FROM conversations WHERE id = ?').run(id);

    res.json({ success: true, message: 'Conversation deleted' });
  } catch (error) {
    console.error('Error deleting conversation:', error);
    res.status(500).json({ error: 'Failed to delete conversation' });
  }
});

// Delete all conversations
app.delete('/conversations', (req, res) => {
  try {
    db.prepare('DELETE FROM messages').run();
    db.prepare('DELETE FROM conversations').run();

    res.json({ success: true, message: 'All conversations deleted' });
  } catch (error) {
    console.error('Error deleting all conversations:', error);
    res.status(500).json({ error: 'Failed to delete conversations' });
  }
});

// Add message to conversation
app.post('/conversations/:id/messages', (req, res) => {
  try {
    const { id } = req.params;
    const { role, content, file_ids } = req.body;

    // Validate conversation exists
    const conversation = db.prepare('SELECT * FROM conversations WHERE id = ?').get(id);
    if (!conversation) {
      return res.status(404).json({ error: 'Conversation not found' });
    }

    // Validate role
    if (!['user', 'assistant'].includes(role)) {
      return res.status(400).json({ error: 'Role must be user or assistant' });
    }

    const messageId = uuidv4();
    const now = new Date().toISOString();

    // Insert message
    db.prepare(`
      INSERT INTO messages (id, conversation_id, role, content, created_at, file_ids)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(
      messageId,
      id,
      role,
      content,
      now,
      file_ids ? JSON.stringify(file_ids) : null
    );

    // Update conversation timestamp and message count
    db.prepare(`
      UPDATE conversations
      SET updated_at = ?, message_count = message_count + 1
      WHERE id = ?
    `).run(now, id);

    res.json({
      id: messageId,
      conversation_id: id,
      role,
      content,
      created_at: now,
      file_ids: file_ids || []
    });
  } catch (error) {
    console.error('Error adding message:', error);
    res.status(500).json({ error: 'Failed to add message' });
  }
});

app.post('/chat', async (req, res) => {
  try {
    const { messages, fileIds, conversation_id } = req.body;

    if (!messages || !Array.isArray(messages)) {
      return res.status(400).json({ error: 'Messages array is required' });
    }

    if (!process.env.ANTHROPIC_API_KEY) {
      return res.status(500).json({ error: 'ANTHROPIC_API_KEY not configured' });
    }

    // Determine conversation ID
    let convId = conversation_id;

    // Generate title from first user message before processing files
    // (we need to do this before content is transformed to content blocks)
    let conversationTitle = null;
    if (!convId) {
      const firstMessage = messages[messages.length - 1].content;
      conversationTitle = typeof firstMessage === 'string' && firstMessage.length > 50
        ? firstMessage.substring(0, 47) + '...'
        : (typeof firstMessage === 'string' ? firstMessage : 'New Conversation');
    }

    // Process files if provided
    if (fileIds && fileIds.length > 0) {
      if (fileIds.length > 5) {
        return res.status(400).json({ error: 'Maximum 5 files per message' });
      }

      const lastMessage = messages[messages.length - 1];
      const contentBlocks = [{ type: 'text', text: lastMessage.content }];

      for (const fileId of fileIds) {
        const file = db.prepare('SELECT * FROM files WHERE id = ?').get(fileId);
        if (!file) {
          return res.status(400).json({ error: `File not found: ${fileId}` });
        }

        const filePath = path.join(__dirname, file.path);
        if (!fs.existsSync(filePath)) {
          return res.status(400).json({ error: `File not found on disk: ${file.original_name}` });
        }

        try {
          const contentBlock = await processFile(file, filePath);
          contentBlocks.push(contentBlock);
        } catch (error) {
          return res.status(400).json({
            error: `Failed to process ${file.original_name}`,
            details: error.message
          });
        }
      }

      messages[messages.length - 1].content = contentBlocks;
    }

    // If no conversation ID, create new conversation now
    if (!convId) {
      const id = uuidv4();
      const now = new Date().toISOString();

      db.prepare(`
        INSERT INTO conversations (id, title, created_at, updated_at, message_count)
        VALUES (?, ?, ?, ?, 0)
      `).run(id, conversationTitle || 'New Conversation', now, now);

      convId = id;
    }

    // Save user message to database
    const userMessage = messages[messages.length - 1];
    const userMessageId = uuidv4();
    const now = new Date().toISOString();

    db.prepare(`
      INSERT INTO messages (id, conversation_id, role, content, created_at, file_ids)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(
      userMessageId,
      convId,
      'user',
      typeof userMessage.content === 'string'
        ? userMessage.content
        : JSON.stringify(userMessage.content),
      now,
      fileIds ? JSON.stringify(fileIds) : null
    );

    // Call Claude API
    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-5',
      max_tokens: 2048,
      messages: messages.map(msg => ({
        role: msg.role,
        content: msg.content,
      })),
    });

    const assistantContent = response.content[0].text;

    // Save assistant message to database
    const assistantMessageId = uuidv4();
    const assistantTime = new Date().toISOString();

    db.prepare(`
      INSERT INTO messages (id, conversation_id, role, content, created_at, file_ids)
      VALUES (?, ?, ?, ?, ?, NULL)
    `).run(assistantMessageId, convId, 'assistant', assistantContent, assistantTime);

    // Update conversation timestamp and message count
    db.prepare(`
      UPDATE conversations
      SET updated_at = ?, message_count = message_count + 2
      WHERE id = ?
    `).run(assistantTime, convId);

    res.json({
      content: assistantContent,
      conversation_id: convId
    });
  } catch (error) {
    console.error('Error calling Claude API:', error);
    res.status(500).json({
      error: 'Failed to get response from Claude',
      details: error.message
    });
  }
});

// File upload endpoint
app.post('/upload', upload.array('files'), (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ error: 'No files uploaded' });
    }

    const insertStmt = db.prepare(`
      INSERT INTO files (id, original_name, stored_name, mime_type, size, uploaded_at, path)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);

    const uploadedFiles = req.files.map((file) => {
      const fileId = uuidv4();
      const uploadedAt = new Date().toISOString();
      const filePath = path.join('uploads', file.filename);

      insertStmt.run(
        fileId,
        file.originalname,
        file.filename,
        file.mimetype,
        file.size,
        uploadedAt,
        filePath
      );

      return {
        id: fileId,
        original_name: file.originalname,
        stored_name: file.filename,
        mime_type: file.mimetype,
        size: file.size,
        uploaded_at: uploadedAt,
        path: filePath,
      };
    });

    res.json(uploadedFiles);
  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({ error: 'Failed to upload files', details: error.message });
  }
});

// Get all files
app.get('/files', (req, res) => {
  try {
    const files = db.prepare('SELECT * FROM files ORDER BY uploaded_at DESC').all();
    res.json(files);
  } catch (error) {
    console.error('Error fetching files:', error);
    res.status(500).json({ error: 'Failed to fetch files', details: error.message });
  }
});

// Get specific file
app.get('/files/:id', (req, res) => {
  try {
    const { id } = req.params;
    const file = db.prepare('SELECT * FROM files WHERE id = ?').get(id);

    if (!file) {
      return res.status(404).json({ error: 'File not found' });
    }

    const filePath = path.join(__dirname, file.path);

    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: 'File not found on disk' });
    }

    res.setHeader('Content-Type', file.mime_type);
    res.setHeader('Content-Disposition', `inline; filename="${file.original_name}"`);

    const fileStream = fs.createReadStream(filePath);
    fileStream.pipe(res);
  } catch (error) {
    console.error('Error retrieving file:', error);
    res.status(500).json({ error: 'Failed to retrieve file', details: error.message });
  }
});

// Delete file
app.delete('/files/:id', (req, res) => {
  try {
    const { id } = req.params;
    const file = db.prepare('SELECT * FROM files WHERE id = ?').get(id);

    if (!file) {
      return res.status(404).json({ error: 'File not found' });
    }

    const filePath = path.join(__dirname, file.path);

    // Delete from database
    db.prepare('DELETE FROM files WHERE id = ?').run(id);

    // Delete file from filesystem
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }

    res.json({ success: true, message: 'File deleted successfully' });
  } catch (error) {
    console.error('Error deleting file:', error);
    res.status(500).json({ error: 'Failed to delete file', details: error.message });
  }
});

// Error handling middleware for multer and other errors
app.use((error, req, res, next) => {
  console.error('Error middleware caught:', error.message);

  // Multer errors
  if (error.code === 'LIMIT_FILE_SIZE') {
    return res.status(400).json({ error: 'File size exceeds 10MB limit' });
  }
  if (error.code === 'LIMIT_FILE_COUNT') {
    return res.status(400).json({ error: 'Maximum 20 files can be uploaded at once' });
  }
  if (error.code === 'LIMIT_UNEXPECTED_FILE') {
    return res.status(400).json({ error: 'Unexpected file field' });
  }

  // File filter errors (our custom messages)
  if (error.message) {
    return res.status(400).json({ error: error.message });
  }

  // Generic error
  res.status(500).json({ error: 'An error occurred during upload' });
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
