import { URL } from 'url';

const TIMEOUT_MS = 15_000;
const MAX_CONTENT_LENGTH = 10_000;
const MAX_DOWNLOAD_BYTES = 2 * 1024 * 1024; // 2MB raw download limit
const USER_AGENT = 'ChatBot/1.0 (Web Content Fetcher)';

// Private/reserved IP ranges that should be blocked (SSRF protection)
const BLOCKED_IP_PATTERNS = [
  /^127\./, // loopback
  /^10\./, // RFC1918
  /^172\.(1[6-9]|2\d|3[01])\./, // RFC1918
  /^192\.168\./, // RFC1918
  /^169\.254\./, // link-local
  /^0\./, // current network
  /^::1$/, // IPv6 loopback
  /^fc00:/i, // IPv6 unique local
  /^fe80:/i, // IPv6 link-local
];

const BLOCKED_HOSTNAMES = ['localhost', 'metadata.google.internal'];

function isBlockedUrl(urlString) {
  let parsed;
  try {
    parsed = new URL(urlString);
  } catch {
    return 'Invalid URL format.';
  }

  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    return `Only http and https URLs are supported (got ${parsed.protocol}).`;
  }

  const hostname = parsed.hostname.toLowerCase();

  if (BLOCKED_HOSTNAMES.includes(hostname)) {
    return 'Access to this host is not allowed.';
  }

  for (const pattern of BLOCKED_IP_PATTERNS) {
    if (pattern.test(hostname)) {
      return 'Access to private/internal network addresses is not allowed.';
    }
  }

  return null;
}

export const definition = {
  name: 'fetch_url',
  description:
    'Fetch and read the text content of a web page URL, such as an article, documentation page, or blog post.',
  input_schema: {
    type: 'object',
    properties: {
      url: {
        type: 'string',
        description: 'The URL of the web page to fetch',
      },
    },
    required: ['url'],
  },
};

function stripHtml(html) {
  return html
    // Remove script and style blocks entirely
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    // Replace common block elements with newlines
    .replace(/<(br|p|div|h[1-6]|li|tr)[^>]*>/gi, '\n')
    // Strip remaining tags
    .replace(/<[^>]+>/g, '')
    // Decode common HTML entities
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ')
    // Collapse whitespace
    .replace(/[ \t]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

async function readBodyWithLimit(response, maxBytes) {
  const reader = response.body.getReader();
  const chunks = [];
  let totalBytes = 0;

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      totalBytes += value.length;
      if (totalBytes > maxBytes) {
        reader.cancel();
        // Keep only what fits within the limit
        const excess = totalBytes - maxBytes;
        chunks.push(value.slice(0, value.length - excess));
        break;
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }

  const combined = new Uint8Array(
    chunks.reduce((acc, c) => acc + c.length, 0),
  );
  let offset = 0;
  for (const chunk of chunks) {
    combined.set(chunk, offset);
    offset += chunk.length;
  }
  return new TextDecoder().decode(combined);
}

export async function execute({ url }) {
  const blocked = isBlockedUrl(url);
  if (blocked) return blocked;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const response = await fetch(url, {
      headers: { 'User-Agent': USER_AGENT },
      signal: controller.signal,
      redirect: 'follow',
    });

    if (!response.ok) {
      return `Failed to fetch URL (status ${response.status}): ${response.statusText}`;
    }

    const contentType = response.headers.get('content-type') ?? '';
    if (!contentType.includes('text/html') && !contentType.includes('text/plain')) {
      return `Cannot read content of type "${contentType}". This tool works best with HTML and plain text pages.`;
    }

    // Pre-check Content-Length if available
    const contentLength = parseInt(response.headers.get('content-length') ?? '', 10);
    if (contentLength > MAX_DOWNLOAD_BYTES) {
      return `Page is too large (${Math.round(contentLength / 1024)}KB). Maximum supported size is ${MAX_DOWNLOAD_BYTES / 1024}KB.`;
    }

    const raw = await readBodyWithLimit(response, MAX_DOWNLOAD_BYTES);
    let text = contentType.includes('text/plain') ? raw : stripHtml(raw);

    if (text.length > MAX_CONTENT_LENGTH) {
      text = text.slice(0, MAX_CONTENT_LENGTH) + '\n\n[Content truncated]';
    }

    return text || 'The page appears to be empty.';
  } catch (error) {
    if (error.name === 'AbortError') {
      return `Request timed out after ${TIMEOUT_MS / 1000} seconds.`;
    }
    return `Failed to fetch URL: ${error.message}`;
  } finally {
    clearTimeout(timeout);
  }
}
