const TIMEOUT_MS = 15_000;
const MAX_CONTENT_LENGTH = 10_000;
const USER_AGENT = 'ChatBot/1.0 (Web Content Fetcher)';

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

export async function execute({ url }) {
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

    const html = await response.text();
    let text = contentType.includes('text/plain') ? html : stripHtml(html);

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
