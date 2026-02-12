import { useState, useCallback, useEffect, useRef } from 'react';
import type { Conversation, Message } from '../types';
import * as api from '../utils/api';
import { generateUUID } from '../utils/uuid';

export interface UseConversationsReturn {
  conversations: Conversation[];
  isHistoryModalOpen: boolean;
  isLoadingConversation: boolean;
  editingTitleId: string | null;
  editingTitleValue: string;
  loadConversation: (conversationId: string) => Promise<void>;
  deleteConversation: (conversationId: string) => Promise<void>;
  deleteAllConversations: () => Promise<void>;
  updateConversationTitle: (
    conversationId: string,
    newTitle: string,
  ) => Promise<void>;
  startNewConversation: () => void;
  startEditingTitle: (conversation: Conversation) => void;
  cancelEditingTitle: () => void;
  setEditingTitleValue: (value: string) => void;
  openHistoryModal: () => void;
  closeHistoryModal: () => void;
  refreshConversations: () => Promise<void>;
}

interface UseConversationsProps {
  currentConversationId: string | null;
  onMessagesLoad: (messages: Message[]) => void;
  onClearSelectedFiles: () => void;
  onNewChat: () => void;
  onDeleteSuccess?: () => void;
  onError?: (message: string) => void;
}

export function useConversations({
  currentConversationId,
  onMessagesLoad,
  onClearSelectedFiles,
  onNewChat,
  onDeleteSuccess,
  onError,
}: UseConversationsProps): UseConversationsReturn {
  const reportError = onError ?? alert;
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState<boolean>(false);
  const [isLoadingConversation, setIsLoadingConversation] = useState<boolean>(false);
  const [editingTitleId, setEditingTitleId] = useState<string | null>(null);
  const [editingTitleValue, setEditingTitleValue] = useState<string>("");

  // Track the current conversation load request to prevent race conditions
  const abortControllerRef = useRef<AbortController | null>(null);

  const loadConversation = useCallback(
    async (conversationId: string): Promise<void> => {
      // Abort any pending conversation load
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }

      // Create new abort controller for this request
      const abortController = new AbortController();
      abortControllerRef.current = abortController;

      setIsLoadingConversation(true);

      // Minimum display time for loading state (prevents flash)
      const minLoadingTime = new Promise(resolve => setTimeout(resolve, 400));

      try {
        const [data] = await Promise.all([
          api.fetchConversation(conversationId, abortController.signal),
          minLoadingTime
        ]);

        // Check if this request was aborted (user navigated away)
        if (abortController.signal.aborted) {
          return;
        }

        // Set messages from conversation
        const messages = data.messages.map((msg) => {
          // Extract display text from content (could be string, JSON string, or content block array)
          let content: string;
          if (Array.isArray(msg.content)) {
            const textBlock = msg.content.find(b => b.type === 'text');
            content = textBlock && 'text' in textBlock ? textBlock.text : '';
          } else {
            content = msg.content;
            try {
              const parsed = JSON.parse(msg.content) as unknown;
              if (
                Array.isArray(parsed) &&
                parsed[0] &&
                typeof parsed[0] === "object" &&
                "type" in parsed[0] &&
                parsed[0].type === "text" &&
                "text" in parsed[0]
              ) {
                content = String(parsed[0].text);
              }
            } catch {
              // Content is already a plain string, use as-is
            }
          }

          return {
            id: msg.id && typeof msg.id === 'string' && msg.id.length > 0
              ? msg.id
              : generateUUID(),
            role: msg.role,
            content: content,
            files: msg.files && msg.files.length > 0 ? msg.files : undefined,
          };
        });

        onMessagesLoad(messages);
        setIsHistoryModalOpen(false);
      } catch (error) {
        // Ignore abort errors (user navigated away)
        if (error instanceof Error && error.name === 'AbortError') {
          return;
        }

        // Ensure minimum loading time even on error
        await minLoadingTime;

        console.error("Failed to load conversation:", error);
        // Navigate to home if conversation not found
        const err = error as Error & { status?: number };
        if (err?.status === 404) {
          reportError("Conversation not found. Redirecting to home.");
          onNewChat();
        } else {
          reportError("Failed to load conversation. Please try again.");
        }
      } finally {
        // Only clear loading if this request wasn't aborted
        if (!abortController.signal.aborted) {
          setIsLoadingConversation(false);
        }
      }
    },
    [onMessagesLoad, onNewChat, reportError],
  );

  const refreshConversations = useCallback(async (): Promise<void> => {
    try {
      const data = await api.fetchConversations();
      setConversations(data);
    } catch (error) {
      console.error("Failed to fetch conversations:", error);
    }
  }, []);

  useEffect(() => {
    // Only load conversations once on mount
    const loadInitial = async () => {
      await refreshConversations();
    };
    loadInitial();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const startNewConversation = useCallback((): void => {
    onMessagesLoad([]);
    onClearSelectedFiles();
    setIsHistoryModalOpen(false);
    onNewChat();
  }, [onMessagesLoad, onClearSelectedFiles, onNewChat]);

  const deleteConversation = async (conversationId: string): Promise<void> => {
    if (!confirm("Delete this conversation? This cannot be undone.")) return;

    try {
      await api.deleteConversation(conversationId);

      setConversations((prev) => prev.filter((c) => c.id !== conversationId));
      onDeleteSuccess?.();

      if (conversationId === currentConversationId) {
        startNewConversation();
      }
    } catch (error) {
      console.error("Failed to delete conversation:", error);
      reportError("Failed to delete conversation. Please try again.");
    }
  };

  const deleteAllConversations = async (): Promise<void> => {
    try {
      await api.deleteAllConversations();

      setConversations([]);
      onDeleteSuccess?.();
      startNewConversation();
    } catch (error) {
      console.error("Failed to delete all conversations:", error);
      reportError("Failed to delete conversations. Please try again.");
    }
  };

  const updateConversationTitle = async (
    conversationId: string,
    newTitle: string,
  ): Promise<void> => {
    if (!newTitle.trim()) return;

    try {
      await api.updateConversationTitle(conversationId, newTitle);

      setConversations((prev) =>
        prev.map((c) =>
          c.id === conversationId ? { ...c, title: newTitle } : c,
        ),
      );

      setEditingTitleId(null);
      setEditingTitleValue("");
    } catch (error) {
      console.error("Failed to update title:", error);
      reportError("Failed to update title. Please try again.");
    }
  };

  const startEditingTitle = (conversation: Conversation): void => {
    setEditingTitleId(conversation.id);
    setEditingTitleValue(conversation.title);
  };

  const cancelEditingTitle = (): void => {
    setEditingTitleId(null);
    setEditingTitleValue("");
  };

  const openHistoryModal = (): void => {
    setIsHistoryModalOpen(true);
  };

  const closeHistoryModal = (): void => {
    setIsHistoryModalOpen(false);
  };

  return {
    conversations,
    isHistoryModalOpen,
    isLoadingConversation,
    editingTitleId,
    editingTitleValue,
    loadConversation,
    deleteConversation,
    deleteAllConversations,
    updateConversationTitle,
    startNewConversation,
    startEditingTitle,
    cancelEditingTitle,
    setEditingTitleValue,
    openHistoryModal,
    closeHistoryModal,
    refreshConversations,
  };
}
