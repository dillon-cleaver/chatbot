# Local LLM Support Implementation Plan

## Overview

Enable users to connect their own LLM providers (custom Anthropic API key or local LLMs like Ollama) while keeping the default server-side Claude Haiku as a secure fallback.

## Architecture

### Two Operating Modes

**Default Mode (Current):**
- Uses server's Claude Haiku API key (secure, no changes needed)
- Flow: Client → Server → Anthropic → Server SQLite
- Works out of the box, no configuration required

**Advanced Mode (New):**
- User provides their own Anthropic API key OR local LLM endpoint
- Flow: Client → LLM Provider directly (bypass server) → Browser IndexedDB
- Fully local, no server storage needed
- API keys never leave the browser

### Data Flow

```
Settings (localStorage) → Mode Router → {
  Default: Server API → SQLite
  Advanced: Direct LLM Call → IndexedDB
}
```

## Implementation Phases

### Phase 1: Core Infrastructure (MVP)

This phase delivers the essential functionality without file attachments.

#### 1.1 Settings System

**Create:**
- `/client/src/types/settings.ts` - TypeScript types for settings
- `/client/src/hooks/useSettings.ts` - Hook for settings management (localStorage)
- `/client/src/components/settings/SettingsModal.tsx` - UI for configuration

**Settings Schema:**
```typescript
{
  mode: "default" | "anthropic-custom" | "local-llm"
  anthropicApiKey?: string
  anthropicModel?: string  // e.g., "claude-sonnet-4-5"
  localEndpoint?: string   // e.g., "http://localhost:11434"
  localModel?: string      // e.g., "llama2", "mistral"
}
```

**UI Requirements:**
- Settings gear icon in Header
- Modal with three mode options:
  1. Default (Server Haiku) - no configuration needed
  2. Custom Anthropic - API key + model dropdown
  3. Local LLM - endpoint URL + model name
- Validation before saving (test API key/endpoint)
- Clear indication of active mode in UI

#### 1.2 LLM Service Abstraction

**Create:**
- `/client/src/services/llmService.ts` - Factory pattern for provider selection
- `/client/src/services/anthropicProvider.ts` - Direct Anthropic API calls from browser
- `/client/src/services/localLLMProvider.ts` - OpenAI-compatible API calls (Ollama/LM Studio)

**Interface:**
```typescript
interface LLMProvider {
  sendMessage(
    messages: Message[],
    systemPrompt: string
  ): Promise<string>
}
```

**Providers:**
- **AnthropicProvider**: Uses `@anthropic-ai/sdk` in browser with user's API key
- **LocalLLMProvider**: HTTP calls to OpenAI-compatible endpoints

#### 1.3 Browser Storage (IndexedDB)

**Create:**
- `/client/src/services/indexedDBService.ts` - Local database management

**Schema (mirrors SQLite):**
```typescript
{
  conversations: {
    id: string
    title: string
    created_at: number
    updated_at: number
    message_count: number
  }
  messages: {
    id: string
    conversation_id: string
    role: "user" | "assistant"
    content: string
    timestamp: number
  }
}
```

**Operations:**
- Create conversation
- Add message
- Load conversation
- List conversations
- Delete conversation

#### 1.4 Hook Integration

**Modify:**
- `/client/src/hooks/useChat.ts`
  - Add mode routing logic
  - Use LLMService factory based on settings
  - Conditionally use IndexedDB or server API for storage

- `/client/src/hooks/useConversations.ts`
  - Load conversations from IndexedDB when in advanced mode
  - Load from server when in default mode

**Logic:**
```typescript
const settings = useSettings()

if (settings.mode === "default") {
  // Current behavior: call server API
  await api.sendChatMessage(...)
} else {
  // New behavior: direct LLM call + IndexedDB
  const provider = LLMServiceFactory.create(settings)
  const response = await provider.sendMessage(...)
  await indexedDB.saveMessage(...)
}
```

#### 1.5 UI Updates

**Modify:**
- `/client/src/components/layout/Header/Header.tsx`
  - Add settings gear icon
  - Open SettingsModal on click

- `/client/src/components/chat/ChatContent/ChatContent.tsx`
  - Hide file attach button when in advanced mode
  - Show info message: "File attachments only available in default mode"

#### 1.6 Dependencies

**Add to `/client/package.json`:**
```json
{
  "@anthropic-ai/sdk": "^0.71.2",
  "idb": "^8.0.0"  // IndexedDB wrapper library
}
```

### Phase 2: File Support in Advanced Mode (Future)

**Not included in MVP. Can be added later:**
- Port `fileProcessor.js` logic to client-side TypeScript
- Use browser-compatible libraries (pdf.js, FileReader API)
- Store processed file data in IndexedDB
- Handle 5MB IndexedDB storage limits

For now: disable file attachments in advanced mode.

## Critical Files

### Files to Create (8 new files)
1. `/client/src/types/settings.ts` - Settings type definitions
2. `/client/src/hooks/useSettings.ts` - Settings state management
3. `/client/src/components/settings/SettingsModal.tsx` - Settings UI
4. `/client/src/services/llmService.ts` - LLM factory
5. `/client/src/services/anthropicProvider.ts` - Anthropic implementation
6. `/client/src/services/localLLMProvider.ts` - Local LLM implementation
7. `/client/src/services/indexedDBService.ts` - Browser database
8. `/client/src/components/settings/index.ts` - Barrel export

### Files to Modify (5 existing files)
1. `/client/src/hooks/useChat.ts` - Add mode routing
2. `/client/src/hooks/useConversations.ts` - Dual storage paths
3. `/client/src/components/layout/Header/Header.tsx` - Settings button
4. `/client/src/components/chat/ChatContent/ChatContent.tsx` - Conditional file UI
5. `/client/package.json` - Add dependencies

## Implementation Sequence

Follow this order to minimize breaking changes:

1. **Settings Infrastructure** (non-breaking)
   - Create settings types and hook
   - Add localStorage persistence
   - No integration yet

2. **Settings UI** (non-breaking)
   - Build SettingsModal component
   - Add button to Header
   - Connect to useSettings hook

3. **LLM Service Layer** (non-breaking)
   - Create provider interfaces
   - Implement Anthropic and Local providers
   - Test in isolation

4. **IndexedDB Service** (non-breaking)
   - Implement database operations
   - Test CRUD operations
   - No integration yet

5. **Hook Integration** (breaking changes start here)
   - Modify useChat to use LLMService
   - Add mode routing
   - Update useConversations

6. **UI Polish**
   - Hide file button in advanced mode
   - Add mode indicator
   - Error handling

7. **Testing**
   - Test all three modes
   - Error scenarios
   - Documentation

## Security & Privacy

**API Key Security:**
- User API keys stored in browser localStorage only
- Never sent to server
- Cleared when switching back to default mode

**Data Privacy:**
- IndexedDB data stays on device (no cloud sync in Phase 1)
- Clear mode indicator in UI so user knows where data lives

**CORS:**
- Anthropic API supports browser CORS (works out of the box)
- Local LLMs need CORS enabled (document setup for Ollama/LM Studio)

## Known Limitations (MVP)

1. **No file attachments in advanced mode** (Phase 2 feature)
2. **No conversation migration** between modes (can add export/import later)
3. **No cloud sync** (future with authentication)
4. **No streaming responses** (can add later)

## Testing Checklist

- [ ] Settings persist across page refresh
- [ ] Default mode works as before (no regression)
- [ ] Custom Anthropic key mode works
- [ ] Local LLM mode works with Ollama
- [ ] Invalid API key shows error
- [ ] Unreachable local endpoint shows error
- [ ] Conversations load from IndexedDB in advanced mode
- [ ] Conversations load from server in default mode
- [ ] File button hidden in advanced mode
- [ ] Mode switching mid-conversation handled gracefully
- [ ] CORS errors handled with helpful messages

## Complexity Estimate

**MVP Implementation:** 31-42 hours (4-5 days)

**Breakdown:**
- Settings UI: 4-6 hours
- LLM Service: 6-8 hours
- IndexedDB: 8-10 hours
- Hook Integration: 6-8 hours
- UI Polish: 3-4 hours
- Testing: 4-6 hours

## Future Enhancements

- Authentication & cloud sync (Supabase)
- File support in advanced mode
- Conversation export/import
- Streaming responses
- Additional providers (OpenAI, Gemini)
- Temperature/parameter controls
- Custom system prompts per mode
