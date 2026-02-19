import { MAX_FILES_PER_MESSAGE } from "../../../constants";
import styles from "./HowItWorksContent.module.css";

export function HowItWorksContent(): React.JSX.Element {
  return (
    <>
      <p>
        This chatbot is powered by <strong>Claude Haiku 4.5</strong> from
        Anthropic. Your files are stored locally in your browser — nothing is
        uploaded to a server. Attach them to analyze content across multiple
        documents, find patterns, search efficiently, and connect information.
      </p>
      <p>
        This chatbot intentionally has a Gen X attitude, with design inspired
        by the Sega Genesis (Mega Drive) era. Its favorite movies are{" "}
        <em>Reality Bites</em>, <em>Office Space</em>, and <em>Clerks</em>.
      </p>
      <p>
        <strong>Context Window:</strong> The chatbot processes approximately
        150,000 words at once (200K tokens, roughly 500 pages of text),
        including both attached files and conversation history. You can attach up
        to <strong>{MAX_FILES_PER_MESSAGE}</strong> files per message.
      </p>
      <p>
        <strong>File Handling:</strong> Files are sent with one message only,
        then auto-removed from selection. The chatbot remembers your conversation
        history, so it can still reference previous file discussions.
      </p>
      <p className={styles.fileTypes}>
        <strong>Supported Files:</strong>{" "}
        <span className={styles.fileTypeSupported}>
          PDF, DOCX, XLSX, PPTX, PNG, JPEG, GIF, WebP, TXT, CSV
        </span>
        . Unsupported:{" "}
        <span className={styles.fileTypeUnsupported}>
          .doc, .xls, .ppt, .avif, .heic, .tiff, .bmp, .svg, .odt, .ods, .odp,
          .rtf, .pages, .numbers, .key
        </span>
        .
      </p>
      <p>
        <strong>Storage & Privacy:</strong> Files are stored locally on your
        computer. Contents are only sent to Anthropic when you submit messages
        (retained 30 days for safety monitoring, then deleted). Your data is not
        used for training.
      </p>
      <p>
        <strong>Best Practices:</strong> Large files combined with long
        conversation history may exceed the 200K token limit on that message.
        Keep files relevant to your question.
      </p>
    </>
  );
}
