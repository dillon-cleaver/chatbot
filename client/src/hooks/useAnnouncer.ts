import { useCallback, useRef, useEffect } from "react";

// Module-level reference counting for shared live regions
let politeRefCount = 0;
let assertiveRefCount = 0;

// Delay before setting announcement text (allows DOM to settle)
const ANNOUNCEMENT_DELAY_MS = 50;

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
    // Create or reuse polite live region
    let politeRegion = document.getElementById(
      "announcer-polite",
    ) as HTMLDivElement | null;
    if (!politeRegion) {
      politeRegion = document.createElement("div");
      politeRegion.setAttribute("aria-live", "polite");
      politeRegion.setAttribute("aria-atomic", "true");
      politeRegion.setAttribute("role", "status");
      politeRegion.className = "visually-hidden";
      politeRegion.id = "announcer-polite";
      document.body.appendChild(politeRegion);
    }
    politeRef.current = politeRegion;
    politeRefCount++;

    // Create or reuse assertive live region (for urgent announcements)
    let assertiveRegion = document.getElementById(
      "announcer-assertive",
    ) as HTMLDivElement | null;
    if (!assertiveRegion) {
      assertiveRegion = document.createElement("div");
      assertiveRegion.setAttribute("aria-live", "assertive");
      assertiveRegion.setAttribute("aria-atomic", "true");
      assertiveRegion.setAttribute("role", "alert");
      assertiveRegion.className = "visually-hidden";
      assertiveRegion.id = "announcer-assertive";
      document.body.appendChild(assertiveRegion);
    }
    assertiveRef.current = assertiveRegion;
    assertiveRefCount++;

    return () => {
      // Only remove DOM elements when no instances are using them
      politeRefCount--;
      if (politeRefCount === 0 && politeRef.current) {
        politeRef.current.remove();
      }
      politeRef.current = null;

      assertiveRefCount--;
      if (assertiveRefCount === 0 && assertiveRef.current) {
        assertiveRef.current.remove();
      }
      assertiveRef.current = null;
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
        }, ANNOUNCEMENT_DELAY_MS);
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
  TOOL_SEARCHING: "Searching the web",
  TOOL_FETCHING: "Fetching web page",
  ERROR: (message: string) => `Error: ${message}`,
} as const;
