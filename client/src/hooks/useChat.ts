import { useState, useCallback } from 'react';
import type { Message, UploadedFile, ContentBlock } from '../types';
import { sendChatMessageStream } from '../utils/api';
import * as indexedDB from '../services/indexedDBService';
import { generateUUID } from '../utils/uuid';
import { processFile } from '../services/fileProcessor';
import { MAX_CONVERSATIONS, MAX_DAILY_CHATS } from '../constants';
import { getDailyCreationCount, recordDailyCreation } from '../utils/dailyChatLimit';

export interface UseChatReturn {
  messages: Message[];
  input: string;
  isLoading: boolean;
  activeToolUse: string | null;
  sendMessage: () => Promise<void>;
  setInput: (input: string) => void;
  setMessages: (messages: Message[]) => void;
}

interface UseChatProps {
  conversationId: string | null;
  selectedFiles: UploadedFile[];
  onConversationCreated: (conversationId: string | null) => void;
  onClearSelectedFiles: () => void;
  getFileObject: (fileId: string) => File | undefined;
  onLimitError: (title: string, message: string) => void;
  onToolUse?: (toolName: string) => void;
}

export function useChat({
  conversationId,
  selectedFiles,
  onConversationCreated,
  onClearSelectedFiles,
  getFileObject,
  onLimitError,
  onToolUse,
}: UseChatProps): UseChatReturn {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [activeToolUse, setActiveToolUse] = useState<string | null>(null);

  const sendMessage = useCallback(async (): Promise<void> => {
    if (!input.trim() || isLoading) return;

    // Check limits before any UI updates so we don't need to roll back
    if (!conversationId) {
      if (getDailyCreationCount() >= MAX_DAILY_CHATS) {
        onLimitError('Daily Limit Reached', `You've reached the daily limit of ${MAX_DAILY_CHATS} new chats. Try again tomorrow.`);
        return;
      }
      const existing = await indexedDB.listConversations();
      if (existing.length >= MAX_CONVERSATIONS) {
        onLimitError('Chat Limit Reached', `You've reached the maximum of ${MAX_CONVERSATIONS} conversations. Delete an existing conversation to start a new one.`);
        return;
      }
    }

    const userMessage: Message = {
      id: generateUUID(),
      role: 'user',
      content: input.trim(),
      files: selectedFiles.length > 0 ? selectedFiles : undefined
    };
    const updatedMessages = [...messages, userMessage];
    setMessages(updatedMessages);
    setInput('');

    // Clear selected files immediately after creating message
    onClearSelectedFiles();

    setIsLoading(true);

    // Track whether this is a new conversation for rollback
    let newConversationId: string | null = null;

    try {
      // Create conversation in IndexedDB on first message
      let activeConversationId = conversationId;
      if (!activeConversationId) {
        const title = input.trim().length > 50
          ? input.trim().substring(0, 47) + '...'
          : input.trim();
        const conv = await indexedDB.createConversation(title);
        activeConversationId = conv.id;
        newConversationId = conv.id;
        onConversationCreated(conv.id);
        recordDailyCreation();
      }

      // Save user message to IndexedDB (with file IDs if any are attached)
      const fileIds = selectedFiles.length > 0
        ? selectedFiles.map((f) => f.id)
        : undefined;
      await indexedDB.addMessage(activeConversationId, 'user', input.trim(), fileIds);

      // Process files into content blocks if any are attached
      let finalMessages = updatedMessages;
      if (selectedFiles.length > 0) {
        const contentBlocks: ContentBlock[] = [{ type: "text", text: input.trim() }];

        for (const uploadedFile of selectedFiles) {
          // Try in-memory first, fall back to IndexedDB for prior-session files
          let fileObject = getFileObject(uploadedFile.id);
          if (!fileObject) {
            try {
              const { blob } = await indexedDB.getFileBlob(uploadedFile.id);
              fileObject = new File([blob], uploadedFile.original_name, {
                type: uploadedFile.mime_type,
              });
            } catch {
              console.warn(`File not found for "${uploadedFile.original_name}". Skipping.`);
              continue;
            }
          }

          const processedFile = await processFile(fileObject);

          if (processedFile.type === "image") {
            contentBlocks.push({
              type: "image",
              source: {
                type: "base64",
                media_type: processedFile.mimeType!,
                data: processedFile.data
              }
            });
          } else if (processedFile.type === "document") {
            contentBlocks.push({
              type: "document",
              source: {
                type: "base64",
                media_type: processedFile.mimeType!,
                data: processedFile.data
              }
            });
          } else {
            contentBlocks.push({
              type: "text",
              text: processedFile.data
            });
          }
        }

        // Create modified messages array with JSON-stringified content blocks
        finalMessages = [...updatedMessages];
        finalMessages[finalMessages.length - 1] = {
          ...finalMessages[finalMessages.length - 1],
          content: JSON.stringify(contentBlocks)
        };
      }

      await sendChatMessageStream(finalMessages, activeConversationId, {
        onToolUse: (event) => {
          setActiveToolUse(event.tool);
          onToolUse?.(event.tool);
        },
        onToolResult: () => {
          setActiveToolUse(null);
        },
        onDone: async (event) => {
          // Save assistant message to IndexedDB
          await indexedDB.addMessage(activeConversationId!, 'assistant', event.content);

          if (import.meta.env.DEV && event.usage) {
            console.group('[Token Usage]');
            console.table({
              input: { tokens: event.usage.input_tokens },
              output: { tokens: event.usage.output_tokens },
              total: { tokens: event.usage.input_tokens + event.usage.output_tokens },
            });
            console.groupEnd();
          }

          setMessages([...updatedMessages, {
            id: generateUUID(),
            role: 'assistant',
            content: event.content,
            usage: event.usage,
          }]);
          setIsLoading(false);
          setActiveToolUse(null);
        },
        onError: (event) => {
          setMessages([
            ...updatedMessages,
            { id: generateUUID(), role: 'assistant', content: `Sorry, I encountered an error: ${event.error}` },
          ]);
          setIsLoading(false);
          setActiveToolUse(null);
        },
      });
    } catch (error) {
      console.error('Error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      setMessages([
        ...updatedMessages,
        { id: generateUUID(), role: 'assistant', content: `Sorry, I encountered an error: ${errorMessage}` },
      ]);
      setIsLoading(false);
      setActiveToolUse(null);

      // Rollback: if we just created a new conversation and the API call failed, clean up
      if (newConversationId) {
        try {
          await indexedDB.deleteConversation(newConversationId);
        } catch {
          // Best effort cleanup
        }
        onConversationCreated(null);
      }
    }
  }, [input, isLoading, messages, conversationId, selectedFiles, onConversationCreated, onClearSelectedFiles, getFileObject, onLimitError, onToolUse]);

  return {
    messages,
    input,
    isLoading,
    activeToolUse,
    sendMessage,
    setInput,
    setMessages,
  };
}
