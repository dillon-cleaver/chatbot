import { useState, useCallback } from 'react';
import type { Message, UploadedFile } from '../types';
import * as api from '../utils/api';
import { generateUUID } from '../utils/uuid';
import { useSettings } from './useSettings';
import { LLMServiceFactory, SYSTEM_PROMPT, type FileAttachment } from '../services/llmService';
import { processFile } from '../services/fileProcessor';
import * as indexedDB from '../services/indexedDBService';

export interface UseChatReturn {
  messages: Message[];
  input: string;
  isLoading: boolean;
  sendMessage: () => Promise<void>;
  setInput: (input: string) => void;
  setMessages: (messages: Message[]) => void;
}

interface UseChatProps {
  conversationId: string | null;
  selectedFileIds: string[];
  selectedFiles: UploadedFile[];
  onConversationCreated: (conversationId: string) => void;
  onClearSelectedFiles: () => void;
}

export function useChat({
  conversationId,
  selectedFileIds,
  selectedFiles,
  onConversationCreated,
  onClearSelectedFiles,
}: UseChatProps): UseChatReturn {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const { settings } = useSettings();

  const sendMessage = useCallback(async (): Promise<void> => {
    if (!input.trim() || isLoading) return;

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

    try {
      if (settings.mode === "default") {
        // Default mode: server proxy for LLM; storage in IndexedDB
        let currentConvId = conversationId;
        if (!currentConvId) {
          const title = input.trim().length > 50
            ? input.trim().substring(0, 47) + "..."
            : input.trim();
          const newConv = await indexedDB.createConversation(title);
          currentConvId = newConv.id;
          if (onConversationCreated) {
            onConversationCreated(currentConvId);
          }
        }

        await indexedDB.addMessage(currentConvId, "user", input.trim());

        // Build messages for API: if we have file IDs, last message content = content blocks (from IndexedDB files)
        let messagesToSend: Message[] = updatedMessages;
        if (selectedFileIds.length > 0) {
          const contentBlocks: Array<
            | { type: "text"; text: string }
            | { type: "image"; source: { type: "base64"; media_type: string; data: string } }
            | { type: "document"; source: { type: "base64"; media_type: string; data: string } }
          > = [{ type: "text", text: input.trim() }];
          for (const fileId of selectedFileIds) {
            const { file, blob } = await indexedDB.getFileBlob(fileId);
            const fileObj = new File([blob], file.original_name, { type: file.mime_type });
            const processed = await processFile(fileObj);
            if (processed.type === "text") {
              contentBlocks.push({ type: "text", text: processed.data });
            } else if (processed.type === "image") {
              contentBlocks.push({
                type: "image",
                source: {
                  type: "base64",
                  media_type: processed.mimeType || "image/png",
                  data: processed.data,
                },
              });
            } else {
              contentBlocks.push({
                type: "document",
                source: {
                  type: "base64",
                  media_type: processed.mimeType || "application/octet-stream",
                  data: processed.data,
                },
              });
            }
          }
          messagesToSend = [
            ...updatedMessages.slice(0, -1),
            { ...updatedMessages[updatedMessages.length - 1], content: contentBlocks as unknown as string },
          ];
        }

        console.log("[Chat] Sending message — mode: default, model: Claude Haiku (server)");
        const data = await api.sendChatMessage(messagesToSend, currentConvId);
        const assistantContent = data.content;
        setMessages([...updatedMessages, { id: crypto.randomUUID(), role: "assistant", content: assistantContent }]);

        await indexedDB.addMessage(currentConvId, "assistant", assistantContent);
      } else {
        // Custom mode: use client-side LLM provider
        if (!settings.provider || !settings.model || !settings.apiKey) {
          throw new Error("Custom mode requires provider, model, and API key");
        }

        // Process file attachments from IndexedDB (same library as default mode)
        let fileAttachments: FileAttachment[] | undefined = undefined;
        if (selectedFileIds.length > 0) {
          const processedFiles = await Promise.all(
            selectedFileIds.map(async (fileId) => {
              try {
                const { file, blob } = await indexedDB.getFileBlob(fileId);
                const fileObj = new File([blob], file.original_name, { type: file.mime_type });
                const processed = await processFile(fileObj);
                return {
                  type: processed.type as "image" | "document" | "text",
                  data: processed.data,
                  mimeType: processed.mimeType,
                } as FileAttachment;
              } catch (error) {
                console.error(`Failed to process file ${fileId}:`, error);
                return null;
              }
            })
          );
          fileAttachments = processedFiles.filter((f): f is FileAttachment => f !== null);
          if (fileAttachments.length === 0 && selectedFileIds.length > 0) {
            throw new Error("Failed to process any of the selected files");
          }
        }

        // Create LLM provider
        const modelName = settings.model;
        const providerName = settings.provider;
        console.log("[Chat] Sending message — mode: custom", { provider: providerName, model: modelName });
        const provider = LLMServiceFactory.create(settings, settings.apiKey);

        // Get or create conversation
        let currentConvId = conversationId;
        if (!currentConvId) {
          const title = input.trim().length > 50 
            ? input.trim().substring(0, 47) + '...'
            : input.trim();
          const newConv = await indexedDB.createConversation(title);
          currentConvId = newConv.id;
          if (onConversationCreated) {
            onConversationCreated(currentConvId);
          }
        }

        // Save user message to IndexedDB
        await indexedDB.addMessage(currentConvId, 'user', input.trim());

        // Call LLM provider
        const response = await provider.sendMessage(
          updatedMessages,
          SYSTEM_PROMPT,
          fileAttachments
        );

        // Save assistant message to IndexedDB
        await indexedDB.addMessage(currentConvId, 'assistant', response);

        setMessages([...updatedMessages, { 
          id: generateUUID(), 
          role: 'assistant', 
          content: response 
        }]);
      }
    } catch (error) {
      console.error('Error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      setMessages([
        ...updatedMessages,
        { id: crypto.randomUUID(), role: 'assistant', content: `Sorry, I encountered an error: ${errorMessage}` },
      ]);
    } finally {
      setIsLoading(false);
    }
  }, [input, isLoading, messages, conversationId, selectedFileIds, selectedFiles, onConversationCreated, onClearSelectedFiles, settings]);

  return {
    messages,
    input,
    isLoading,
    sendMessage,
    setInput,
    setMessages,
  };
}
