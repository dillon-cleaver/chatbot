# Keyboard Layout Revision Plan

## Current Issues from Screenshot

1. ❌ **Header disappears** when keyboard opens (sticky positioning didn't work)
2. ✅ **Text is centered** (user likes this)
3. ❌ **Input is centered** instead of sitting at the bottom above keyboard

## User Requirements

1. Header should remain visible at top when keyboard opens
2. "CHATBOT / type, type, type" text should be centered in the middle
3. Input should sit at the bottom, just above the keyboard

## Target Layout

```
┌─────────────────────┐
│ CHATBOT Header      │ ← FIXED at top
├─────────────────────┤
│                     │
│                     │
│   CHATBOT           │ ← CENTERED in middle
│   type, type, type  │
│                     │
│                     │
├─────────────────────┤
│ [📎] [Input] [SEND] │ ← AT BOTTOM above keyboard
└─────────────────────┘
  ⌨️ Keyboard
```

## Why Sticky Didn't Work

`position: sticky` requires:
- A scrollable container parent
- The element must not be a flex child in certain configurations
- iOS Safari has known quirks with sticky in flexbox layouts

**Solution:** Use `position: fixed` instead.

## Implementation Plan

### Phase 1: Fix Header with Fixed Positioning

**File:** `client/src/components/layout/Header/Header.module.css`

**Change from:**
```css
position: sticky; /* Doesn't work in this flex layout */
```

**Change to:**
```css
position: fixed; /* Force header to stay at top */
left: 0;
right: 0;
```

**Impact:** Header will definitely stay at top, but we need to add padding to content below.

### Phase 2: Add Padding for Fixed Header

**File:** `client/src/components/chat/ChatContent/ChatContent.module.css`

**Add:**
```css
@media (max-width: 768px) {
  .app {
    padding-top: calc(60px + env(safe-area-inset-top)); /* Header height + safe area */
  }
}
```

**Rationale:** Compensate for fixed header so content doesn't hide underneath.

### Phase 3: Separate Greeting and Input Positioning

**File:** `client/src/components/chat/ChatContainer/ChatContainer.module.css`

**Current issue:**
```css
.emptyContent {
  justify-content: center; /* Centers BOTH greeting and input together */
}
```

**Solution - create separate positioning:**

**Option A: Wrap greeting separately**
Modify the React component to wrap greeting in a div, then style:
```css
.emptyContent {
  flex: 1; /* Fill available height */
  display: flex;
  flex-direction: column;
  justify-content: space-between; /* Separate greeting and input */
}

.greetingWrapper {
  flex: 1; /* Fill available space */
  display: flex;
  align-items: center; /* Center greeting vertically in its space */
  justify-content: center; /* Center greeting horizontally */
}

/* Input stays at bottom naturally */
```

**Option B: CSS-only solution**
```css
.emptyContent {
  flex: 1;
  display: flex;
  flex-direction: column;
}

/* Push greeting to center of available space */
.emptyContent > :first-child {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
}

/* Input stays at bottom */
.emptyContent > :last-child {
  margin-top: auto; /* Pushes to bottom if needed */
}
```

## Recommended Approach

**CSS-only solution** to avoid component changes:

```css
@media (max-width: 768px) {
  .chatContainerEmpty {
    padding: 1rem 0.5rem;
    padding-bottom: max(1rem, env(safe-area-inset-bottom));
    /* Don't use justify-content here */
  }

  .emptyContent {
    flex: 1; /* Fill height */
    display: flex;
    flex-direction: column;
    gap: 0; /* Remove gap, we'll handle spacing with flex */
  }

  /* Greeting - centered in available space */
  .emptyContent > :first-child {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 0.25rem; /* Internal spacing for CHATBOT + subtitle */
  }

  /* Input - sits at bottom */
  .emptyContent > :last-child {
    flex-shrink: 0; /* Don't shrink */
  }
}
```

## Complete Implementation

### 1. Header.module.css
```css
@media (max-width: 768px) {
  .header {
    position: fixed; /* Changed from sticky */
    top: 0;
    left: 0;
    right: 0;
    z-index: 100;
    padding: 0.75rem 1rem;
    padding-top: max(0.75rem, env(safe-area-inset-top));
  }
  /* ... rest unchanged ... */
}
```

### 2. ChatContent.module.css
```css
@media (max-width: 768px) {
  .app {
    padding-top: 60px; /* Approximate header height */
  }

  /* For devices with notch */
  @supports (padding-top: env(safe-area-inset-top)) {
    .app {
      padding-top: calc(60px + env(safe-area-inset-top));
    }
  }

  /* ... existing styles ... */
}
```

### 3. ChatContainer.module.css
```css
@media (max-width: 768px) {
  .chatContainer {
    padding: 0 0.5rem 0.5rem 0.5rem;
    padding-bottom: max(0.5rem, env(safe-area-inset-bottom));
  }

  .chatContainerEmpty {
    padding: 1rem 0.5rem;
    padding-bottom: max(1rem, env(safe-area-inset-bottom));
    /* Remove justify-content: center */
  }

  .emptyContent {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 0;
  }

  /* Center greeting in available space */
  .emptyContent > :first-child {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 0.25rem;
  }

  /* Keep input at bottom */
  .emptyContent > :last-child {
    flex-shrink: 0;
  }
}
```

## Files to Modify

1. `Header.module.css` - Change sticky to fixed, add left/right
2. `ChatContent.module.css` - Add padding-top for fixed header
3. `ChatContainer.module.css` - Revise empty layout to separate greeting/input positioning

## Testing

- [ ] Header visible at top when keyboard opens
- [ ] Greeting centered in middle space
- [ ] Input at bottom, just above keyboard
- [ ] No content overlap with fixed header
