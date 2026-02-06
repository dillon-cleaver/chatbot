# Local LLM Integration Plan

## Overview

Add support for local LLM servers running on the user's machine. This provides:
- **Zero API costs** - no cloud charges
- **Maximum privacy** - data never leaves your computer
- **Offline capability** - works without internet
- **Full control** - run any model you want

## Popular Local LLM Servers

### 1. Ollama (Recommended)
**Why it's best:** Simple CLI, automatic model management, OpenAI-compatible API

- **Website:** https://ollama.ai
- **Install:** Single command (`curl` + install script)
- **API:** `http://localhost:11434`
- **API Format:** OpenAI-compatible
- **Models:** 100+ models available via `ollama pull`

### 2. LM Studio
**Why it's popular:** User-friendly GUI, great for non-technical users

- **Website:** https://lmstudio.ai
- **Install:** Desktop app (macOS, Windows, Linux)
- **API:** `http://localhost:1234` (OpenAI-compatible)
- **API Format:** OpenAI-compatible
- **Models:** Browse and download from GUI

### 3. llama.cpp Server
**Why use it:** Lightweight, low-level control, CPU-optimized

- **Website:** https://github.com/ggerganov/llama.cpp
- **Install:** Build from source
- **API:** `http://localhost:8080`
- **API Format:** Custom (llama.cpp format)
- **Models:** Download GGUF files manually

### 4. text-generation-webui (oobabooga)
**Why use it:** Comprehensive features, good for experimentation

- **Website:** https://github.com/oobabooga/text-generation-webui
- **Install:** Python environment
- **API:** `http://localhost:5000`
- **API Format:** Custom
- **Models:** Supports HuggingFace models

### 5. KoboldCpp
**Why use it:** Popular for creative writing, simple to use

- **Website:** https://github.com/LostRuins/koboldcpp
- **Install:** Single executable
- **API:** `http://localhost:5001`
- **API Format:** KoboldAI-compatible
- **Models:** GGUF files

## Popular Models to Support

### Large Models (16GB+ RAM recommended)
- **Llama 3.3 70B** - Meta's latest, best for complex tasks
- **Qwen 2.5 72B** - Alibaba's powerful model, great at coding
- **Mixtral 8x7B** - Mixture-of-experts, efficient for its size

### Medium Models (8-16GB RAM)
- **Llama 3.1 8B** - Excellent balance of speed and capability
- **Mistral 7B v0.3** - Fast, capable, good reasoning
- **Qwen 2.5 14B** - Great all-rounder
- **DeepSeek V3** - Strong at coding tasks
- **Gemma 2 9B** - Google's efficient model

### Small Models (4-8GB RAM)
- **Llama 3.2 3B** - Surprisingly capable for size
- **Phi-4** - Microsoft's small but smart model
- **Gemma 2 2B** - Lightweight, fast
- **Qwen 2.5 3B** - Good for basic tasks

### Tiny Models (<4GB RAM)
- **Phi-3.5 Mini** - 3.8B, runs on potato hardware
- **TinyLlama 1.1B** - Extremely fast, basic capabilities

## Implementation Plan

### Phase 1: Core Architecture (1-2 days)

#### 1.1 Add Local Provider Interface
**File:** `client/src/services/providers/localProvider.ts`

```typescript
export interface LocalLLMConfig {
  serverType: 'ollama' | 'lmstudio' | 'llamacpp' | 'textgen' | 'koboldcpp';
  baseUrl: string; // e.g., "http://localhost:11434"
  model: string;   // e.g., "llama3.1:8b"
}

export class LocalProvider implements LLMProvider {
  private config: LocalLLMConfig;

  constructor(config: LocalLLMConfig) {
    this.config = config;
  }

  async sendMessage(messages: Message[], systemPrompt: string): Promise<string> {
    // Implementation depends on serverType
  }

  async testConnection(): Promise<boolean> {
    // Ping the local server
  }
}
```

#### 1.2 Update Types
**File:** `client/src/types/settings.ts`

```typescript
export type Provider = "anthropic" | "openai" | "google" | "local";

export interface Settings {
  mode: "default" | "custom";
  provider?: Provider;
  model?: string;
  apiKey?: string;
  localConfig?: {
    serverType: 'ollama' | 'lmstudio' | 'llamacpp' | 'textgen' | 'koboldcpp';
    baseUrl: string;
  };
}
```

#### 1.3 Add to Factory
**File:** `client/src/services/llmService.ts`

```typescript
case "local":
  if (!settings.localConfig) {
    throw new ValidationError("Local server configuration required");
  }
  return new LocalProvider({
    serverType: settings.localConfig.serverType,
    baseUrl: settings.localConfig.baseUrl,
    model: settings.model,
  });
```

### Phase 2: Server-Specific Implementations (2-3 days)

#### 2.1 Ollama Implementation (Priority 1)
Ollama uses OpenAI-compatible API:

```typescript
// POST http://localhost:11434/v1/chat/completions
{
  "model": "llama3.1:8b",
  "messages": [...],
  "stream": false
}
```

#### 2.2 LM Studio Implementation (Priority 2)
Also OpenAI-compatible:

```typescript
// POST http://localhost:1234/v1/chat/completions
{
  "model": "llama-3.1-8b",
  "messages": [...],
  "temperature": 0.7
}
```

#### 2.3 llama.cpp Server (Priority 3)
Custom format:

```typescript
// POST http://localhost:8080/completion
{
  "prompt": "User: hello\nAssistant:",
  "n_predict": 512
}
```

### Phase 3: UI Updates (1-2 days)

#### 3.1 Settings Modal Changes
Add "Local LLM" option to provider dropdown:

```tsx
<select>
  <option value="">Select provider...</option>
  <option value="anthropic">Anthropic</option>
  <option value="openai">OpenAI</option>
  <option value="google">Google</option>
  <option value="local">Local LLM</option>
</select>
```

When "local" is selected, show:
1. **Server Type** dropdown (Ollama, LM Studio, llama.cpp, etc.)
2. **Server URL** input (default: http://localhost:11434)
3. **Model** dropdown or text input
4. **Test Connection** button (pings the server)

#### 3.2 Model Discovery
For Ollama, we can fetch available models:

```typescript
// GET http://localhost:11434/api/tags
// Returns: { "models": [{ "name": "llama3.1:8b", ... }] }
```

Populate the model dropdown dynamically.

#### 3.3 Status Indicator
Show connection status in the settings:
- 🟢 Connected to Ollama (llama3.1:8b)
- 🔴 Cannot connect to local server
- ⚠️ Server running but model not loaded

### Phase 4: Model Presets (1 day)

#### 4.1 Create Model Library
**File:** `client/src/constants/localModels.ts`

```typescript
export const LOCAL_MODEL_PRESETS = {
  ollama: [
    { id: "llama3.3:70b", name: "Llama 3.3 70B", ram: "40GB+", speed: "slow" },
    { id: "llama3.1:8b", name: "Llama 3.1 8B", ram: "8GB", speed: "fast" },
    { id: "mistral:7b", name: "Mistral 7B", ram: "8GB", speed: "fast" },
    { id: "qwen2.5:14b", name: "Qwen 2.5 14B", ram: "16GB", speed: "medium" },
    { id: "phi4", name: "Phi-4", ram: "4GB", speed: "very fast" },
    { id: "gemma2:9b", name: "Gemma 2 9B", ram: "8GB", speed: "fast" },
    { id: "deepseek-v3", name: "DeepSeek V3", ram: "8GB", speed: "fast" },
  ],
  lmstudio: [
    // LM Studio uses different naming
    { id: "llama-3.1-8b-instruct", name: "Llama 3.1 8B Instruct", ram: "8GB" },
    // ... etc
  ],
};
```

#### 4.2 UI for Model Selection
Show model cards with details:

```
┌─────────────────────────────────────┐
│ 🦙 Llama 3.1 8B                     │
│ RAM: 8GB | Speed: Fast              │
│ Good all-around model               │
│                     [Select Model]  │
└─────────────────────────────────────┘
```

### Phase 5: Advanced Features (Optional, 2-3 days)

#### 5.1 Model Parameters
Allow users to adjust:
- **Temperature** (0.0 - 2.0) - creativity control
- **Max Tokens** - response length limit
- **Context Length** - conversation memory
- **System Prompt** - custom instructions

#### 5.2 Model Download Helper
For Ollama, show install instructions:

```
To use this model, run:
  ollama pull llama3.1:8b

This will download ~4.7GB
```

#### 5.3 Performance Monitoring
Show in UI:
- Tokens/second
- Response time
- Memory usage

#### 5.4 Streaming Support
Implement streaming responses for local LLMs (same as we do for cloud APIs).

## Testing Strategy

### Unit Tests
- LocalProvider connection logic
- API format conversion (Ollama → messages)
- Error handling for unreachable servers

### Integration Tests
1. Spin up Ollama in Docker
2. Pull a tiny model (phi-3.5-mini)
3. Test full message flow
4. Verify streaming works

### Manual Testing Checklist
- [ ] Ollama connection and model selection
- [ ] LM Studio connection
- [ ] llama.cpp connection
- [ ] Model list fetching
- [ ] Error messages for unreachable server
- [ ] Switch between local and cloud providers
- [ ] File attachments with local models
- [ ] Conversation history persistence

## Security Considerations

### CORS Issues
Local servers often need CORS enabled:

**Ollama:** Set environment variable:
```bash
OLLAMA_ORIGINS="http://localhost:5173" ollama serve
```

**LM Studio:** Enable CORS in settings (usually on by default)

**llama.cpp:** Start with `--cors` flag

### Document in UI
Add help text in settings:
```
If connection fails, ensure your local server allows CORS from this origin.
For Ollama: OLLAMA_ORIGINS="http://localhost:5173" ollama serve
```

## Documentation

### User Guide
Create `docs/LOCAL_LLM_SETUP.md`:
1. Choose a local LLM server (recommend Ollama)
2. Install and start the server
3. Pull a model (`ollama pull llama3.1:8b`)
4. Configure in chatbot settings
5. Test connection

### Developer Guide
Update `CLAUDE.md`:
- Explain local provider architecture
- Document API formats for each server type
- Show how to add new server types

## Estimated Timeline

- **Phase 1 (Core):** 1-2 days
- **Phase 2 (Implementations):** 2-3 days
  - Ollama: 1 day
  - LM Studio: 0.5 day
  - llama.cpp: 1 day
- **Phase 3 (UI):** 1-2 days
- **Phase 4 (Presets):** 1 day
- **Phase 5 (Advanced):** Optional, 2-3 days

**Total:** 5-8 days for full implementation (excluding advanced features)

**MVP (Ollama only):** 2-3 days

## Success Criteria

✅ Users can connect to Ollama, LM Studio, or llama.cpp
✅ Model selection works (manual or auto-detected)
✅ Messages send and receive correctly
✅ File attachments work with local models
✅ Error messages are clear when server unavailable
✅ Settings persist across sessions
✅ Performance is acceptable (streaming helps)
✅ Documentation exists for setup

## Future Enhancements

- **Model comparison mode** - run same prompt on multiple models
- **Cost tracking** - show savings vs cloud APIs
- **Model recommendations** - suggest models based on user's hardware
- **Quantization selector** - choose Q4_K_M vs Q8_0 etc.
- **Batch processing** - run prompts across multiple models
- **Local embeddings** - for RAG/semantic search over attached files
- **Voice input/output** - with local Whisper + TTS

## Notes

- Start with Ollama - it's the most user-friendly and popular
- OpenAI-compatible APIs are easiest to implement (Ollama, LM Studio)
- Local LLMs are slower but private - set user expectations
- CORS is the #1 issue users will hit - document clearly
- Consider adding a "recommended models" section based on common hardware (M1/M2 Macs, NVIDIA GPUs, etc.)
