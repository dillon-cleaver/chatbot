import { useState, useCallback } from 'react';
import type { Message, UploadedFile } from '../types';
import * as api from '../utils/api';

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

  const sendMessage = useCallback(async (): Promise<void> => {
    if (!input.trim() || isLoading) return;

    const userMessage: Message = {
      id: crypto.randomUUID(),
      role: 'user',
      content: input.trim(),
      files: selectedFiles.length > 0 ? selectedFiles : undefined
    };
    const updatedMessages = [...messages, userMessage];
    setMessages(updatedMessages);
    setInput('');
    setIsLoading(true);

    try {
      const data = await api.sendChatMessage(updatedMessages, conversationId, selectedFileIds);
      setMessages([...updatedMessages, { id: crypto.randomUUID(), role: 'assistant', content: data.content }]);

      // Set conversation ID if it's a new conversation
      if (!conversationId && onConversationCreated) {
        onConversationCreated(data.conversation_id);
      }

      // Clear selected files after successful send
      onClearSelectedFiles();
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
  }, [input, isLoading, messages, conversationId, selectedFileIds, selectedFiles, onConversationCreated, onClearSelectedFiles]);

  return {
    messages,
    input,
    isLoading,
    sendMessage,
    setInput,
    setMessages,
  };
}
