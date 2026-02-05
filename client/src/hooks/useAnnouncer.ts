import { useCallback, useRef, useEffect } from "react";

/**
 * Custom hook for announcing messages to screen readers via ARIA live regions.
 *
 * This creates a visually hidden live region that screen readers will announce
 * when the content changes.
 *
 * Usage:
 * ```tsx
 * const announce = useAnnouncer();
 *
 * const handleSubmit = async () => {
 *   await sendMessage();
 *   announce('Message sent');
 * };
 * ```
 */
export function useAnnouncer(): (
  message: string,
  priority?: "polite" | "assertive",
) => void {
  const politeRef = useRef<HTMLDivElement | null>(null);
  const assertiveRef = useRef<HTMLDivElement | null>(null);

  // Create live regions on mount
  useEffect(() => {
    // Create polite live region
    const politeRegion = document.createElement("div");
    politeRegion.setAttribute("aria-live", "polite");
    politeRegion.setAttribute("aria-atomic", "true");
    politeRegion.setAttribute("role", "status");
    politeRegion.className = "visually-hidden";
    politeRegion.id = "announcer-polite";
    document.body.appendChild(politeRegion);
    politeRef.current = politeRegion;

    // Create assertive live region (for urgent announcements)
    const assertiveRegion = document.createElement("div");
    assertiveRegion.setAttribute("aria-live", "assertive");
    assertiveRegion.setAttribute("aria-atomic", "true");
    assertiveRegion.setAttribute("role", "alert");
    assertiveRegion.className = "visually-hidden";
    assertiveRegion.id = "announcer-assertive";
    document.body.appendChild(assertiveRegion);
    assertiveRef.current = assertiveRegion;

    return () => {
      politeRegion.remove();
      assertiveRegion.remove();
    };
  }, []);

  const announce = useCallback(
    (message: string, priority: "polite" | "assertive" = "polite") => {
      const region =
        priority === "assertive" ? assertiveRef.current : politeRef.current;
      if (region) {
        // Clear and set message to trigger announcement
        region.textContent = "";
        // Use setTimeout to ensure the DOM update triggers the announcement
        setTimeout(() => {
          region.textContent = message;
        }, 50);
      }
    },
    [],
  );

  return announce;
}

/**
 * Pre-defined announcement messages for common actions.
 * Use with useAnnouncer hook for consistent messaging.
 */
export const ANNOUNCEMENTS = {
  MESSAGE_SENT: "Message sent",
  MESSAGE_SENDING: "Sending message...",
  FILE_UPLOADED: (count: number) =>
    `${count} file${count !== 1 ? "s" : ""} uploaded`,
  FILE_DELETED: "File deleted",
  FILE_SELECTED: (name: string) => `${name} selected`,
  FILE_DESELECTED: (name: string) => `${name} deselected`,
  CONVERSATION_LOADED: "Conversation loaded",
  CONVERSATION_DELETED: "Conversation deleted",
  ERROR: (message: string) => `Error: ${message}`,
} as const;
