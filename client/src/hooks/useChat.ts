import { useState, useCallback } from 'react';
import type { Message, UploadedFile, ContentBlock } from '../types';
import * as api from '../utils/api';
import { generateUUID } from '../utils/uuid';
import { processFile } from '../services/fileProcessor';

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
  selectedFiles: UploadedFile[];
  onConversationCreated: (conversationId: string) => void;
  onClearSelectedFiles: () => void;
  getFileObject: (fileId: string) => File | undefined;
}

export function useChat({
  conversationId,
  selectedFiles,
  onConversationCreated,
  onClearSelectedFiles,
  getFileObject,
}: UseChatProps): UseChatReturn {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);

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
      // Process files into content blocks if any are attached
      let finalMessages = updatedMessages;
      if (selectedFiles.length > 0) {
        const contentBlocks: ContentBlock[] = [{ type: "text", text: input.trim() }];

        // Get File objects from fileManager and process them
        for (const uploadedFile of selectedFiles) {
          const fileObject = getFileObject(uploadedFile.id);
          if (!fileObject) {
            console.warn(`File object not found for "${uploadedFile.original_name}" (stale selection after refresh). Skipping.`);
            continue;
          }

          try {
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
              // text type
              contentBlocks.push({
                type: "text",
                text: processedFile.data
              });
            }
          } catch (error) {
            const errorMsg = error instanceof Error ? error.message : 'Unknown error';
            throw new Error(`Failed to process ${uploadedFile.original_name}: ${errorMsg}`);
          }
        }

        // Create modified messages array with content blocks
        finalMessages = [...updatedMessages];
        finalMessages[finalMessages.length - 1] = {
          ...finalMessages[finalMessages.length - 1],
          content: contentBlocks
        };
      }

      const data = await api.sendChatMessage(finalMessages, conversationId);
      setMessages([...updatedMessages, { id: crypto.randomUUID(), role: 'assistant', content: data.content }]);

      // Set conversation ID if it's a new conversation
      if (!conversationId && onConversationCreated) {
        onConversationCreated(data.conversation_id);
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
  }, [input, isLoading, messages, conversationId, selectedFiles, onConversationCreated, onClearSelectedFiles, getFileObject]);

  return {
    messages,
    input,
    isLoading,
    sendMessage,
    setInput,
    setMessages,
  };
}
