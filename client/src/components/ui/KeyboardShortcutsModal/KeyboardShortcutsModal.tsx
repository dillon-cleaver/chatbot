import { useRef, useState, useCallback } from "react";
import { Modal } from "../Modal/Modal";
import { CollapsibleSection } from "../CollapsibleSection/CollapsibleSection";
import type { CollapsibleSectionRef } from "../CollapsibleSection/CollapsibleSection";
import { HowItWorksContent } from "../HowItWorksContent";
import { KEYBOARD_SHORTCUTS } from "../../../hooks/useKeyboardShortcuts";
import styles from "./KeyboardShortcutsModal.module.css";

export interface KeyboardShortcutsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function KeyboardShortcutsModal({
  isOpen,
  onClose,
}: KeyboardShortcutsModalProps): React.JSX.Element {
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const collapsibleRef = useRef<CollapsibleSectionRef>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const itemRefs = useRef<(HTMLDivElement | null)[]>([]);
  const [focusedIndex, setFocusedIndex] = useState(0);

  const handleCloseButtonKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      collapsibleRef.current?.focus();
    }
  }, []);

  const handleCollapsibleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === "ArrowUp") {
      e.preventDefault();
      closeButtonRef.current?.focus();
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      setFocusedIndex(0);
      itemRefs.current[0]?.focus();
    }
  }, []);

  const handleListKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      const count = KEYBOARD_SHORTCUTS.length;
      let newIndex = focusedIndex;

      switch (e.key) {
        case "ArrowDown":
          e.preventDefault();
          newIndex = Math.min(focusedIndex + 1, count - 1);
          break;
        case "ArrowUp":
          e.preventDefault();
          if (focusedIndex === 0) {
            collapsibleRef.current?.focus();
            return;
          }
          newIndex = Math.max(focusedIndex - 1, 0);
          break;
        case "Home":
          e.preventDefault();
          newIndex = 0;
          break;
        case "End":
          e.preventDefault();
          newIndex = count - 1;
          break;
        default:
          return;
      }

      if (newIndex !== focusedIndex) {
        setFocusedIndex(newIndex);
        itemRefs.current[newIndex]?.focus();
      }
    },
    [focusedIndex],
  );

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Help"
      closeButtonRef={closeButtonRef}
      onCloseButtonKeyDown={handleCloseButtonKeyDown}
    >
      <div className={styles.helpContent}>
        <CollapsibleSection
          ref={collapsibleRef}
          label="How Chatbot Works"
          defaultOpen={false}
          className={styles.infoSection}
          onKeyDown={handleCollapsibleKeyDown}
        >
          <HowItWorksContent />
        </CollapsibleSection>

        <div id="keyboard-shortcuts-label" className={styles.sectionLabel}>
          Keyboard Shortcuts
        </div>

        <div
          ref={listRef}
          className={styles.shortcutsList}
          role="list"
          aria-labelledby="keyboard-shortcuts-label"
          onKeyDown={handleListKeyDown}
        >
          {KEYBOARD_SHORTCUTS.map((shortcut, index) => (
            <div
              key={index}
              ref={(el) => {
                itemRefs.current[index] = el;
              }}
              className={styles.shortcutItem}
              role="listitem"
              tabIndex={index === focusedIndex ? 0 : -1}
              onFocus={() => setFocusedIndex(index)}
            >
              <div className={styles.keys}>
                {shortcut.keys.map((key, keyIndex) => (
                  <span key={keyIndex}>
                    <kbd className={styles.key}>{key}</kbd>
                    {keyIndex < shortcut.keys.length - 1 && (
                      <span className={styles.separator}> + </span>
                    )}
                  </span>
                ))}
              </div>
              <span className={styles.description}>{shortcut.description}</span>
            </div>
          ))}
        </div>
      </div>
    </Modal>
  );
}
