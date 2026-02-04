# Keyboard Visibility Improvements Plan

## Issues from Screenshots

### Issue 1: Header Disappears When Keyboard Opens
**Problem:** The navbar (header with "CHATBOT" title and theme/history buttons) scrolls off-screen when the mobile keyboard appears.

**Root Cause:**
- Header is not using fixed positioning
- When keyboard opens, viewport shrinks and content scrolls up
- Header scrolls out of view along with the page

**Solution:** Make header sticky/fixed on mobile so it stays visible during keyboard input.

### Issue 2: Title/Greeting Hidden When Keyboard Opens
**Problem:** The "CHATBOT" title and "type, type, type" subtitle completely disappear when keyboard opens.

**Root Causes:**
- Current layout uses `justify-content: space-between` on mobile
- This pushes the greeting to the very top and input to the very bottom
- When keyboard opens and viewport shrinks, the greeting is pushed off-screen above the fold
- The massive vertical spacing doesn't work with reduced keyboard viewport

**Solution:**
- Center the greeting and input together as a unit
- Reduce gap between greeting and input on mobile
- Use `justify-content: center` instead of `space-between` when keyboard might be open
- Ensure the greeting + input combo fits in the keyboard-reduced viewport

---

## Implementation Plan

### Phase 1: Make Header Sticky on Mobile
**Goal:** Header remains visible at top when keyboard opens

**File:** `client/src/components/layout/Header/Header.module.css`

**Changes:**
```css
@media (max-width: 768px) {
  .header {
    position: sticky; /* Make header stick to top */
    top: 0; /* Stick to top of viewport */
    z-index: 100; /* Ensure it's above content */
    padding: 0.75rem 1rem;
    padding-top: max(0.75rem, env(safe-area-inset-top));
  }

  /* ... rest of existing mobile styles ... */
}
```

**Rationale:**
- `position: sticky` keeps header visible during scroll and keyboard open
- `top: 0` anchors it to the viewport top
- `z-index: 100` ensures it stays above scrolling content
- Works on iOS Safari and modern browsers

### Phase 2: Center Greeting + Input Together
**Goal:** Keep greeting visible and centered when keyboard opens

**File:** `client/src/components/chat/ChatContainer/ChatContainer.module.css`

**Current Issue:**
```css
.chatContainerEmpty {
  justify-content: space-between; /* ❌ Spreads content too far apart */
}

.emptyContent {
  justify-content: space-between; /* ❌ Pushes greeting up, input down */
}
```

**Solution:**
```css
@media (max-width: 768px) {
  .chatContainerEmpty {
    justify-content: center; /* ✓ Center the content group */
    padding: 1rem 0.5rem;
    padding-bottom: max(1rem, env(safe-area-inset-bottom));
  }

  .emptyContent {
    gap: 1rem; /* ✓ Reduce from 1.5rem - tighter spacing */
    flex: 0 1 auto; /* ✓ Don't grow to fill space */
    justify-content: center; /* ✓ Center content */
    align-items: center; /* ✓ Center horizontally too */
  }
}
```

**Rationale:**
- `justify-content: center` on container centers the greeting+input unit vertically
- Reducing gap from 1.5rem to 1rem keeps them closer together
- `flex: 0 1 auto` prevents content from stretching to fill space
- This ensures both greeting and input remain visible in the reduced keyboard viewport

### Phase 3: Optimize Greeting Size for Keyboard Viewport
**Goal:** Make greeting text smaller on mobile to fit with keyboard open

**File:** `client/src/components/chat/ChatContent/ChatContent.module.css`

**Current:**
```css
@media (max-width: 768px) {
  .emptyTitle {
    font-size: 2.5rem; /* Still quite large for keyboard viewport */
  }

  .emptySubtitle {
    font-size: 1rem;
  }
}
```

**Enhanced:**
```css
@media (max-width: 768px) {
  .emptyTitle {
    font-size: 2rem; /* Reduce from 2.5rem to fit better */
    letter-spacing: 2px;
    margin-bottom: 0.25rem; /* Tighten spacing */
  }

  .emptySubtitle {
    font-size: 0.95rem; /* Slightly reduce */
  }
}

@media (max-width: 480px) {
  .emptyTitle {
    font-size: 1.75rem; /* Further reduce for small screens */
    letter-spacing: 1px;
  }

  .emptySubtitle {
    font-size: 0.9rem;
  }
}
```

**Rationale:**
- Smaller title ensures greeting fits in keyboard-reduced viewport
- Reduced margin/spacing keeps it compact
- Still maintains visual hierarchy and branding
- Very small screens get additional size reduction

### Phase 4: Adjust Empty Container Gap
**Goal:** Reduce vertical spacing in empty greeting section

**File:** `client/src/components/chat/ChatContent/ChatContent.module.css`

**Changes:**
```css
@media (max-width: 768px) {
  .emptyGreeting {
    gap: 0.25rem; /* Add explicit gap control, reduce from default 0.5rem */
  }
}
```

**Rationale:**
- Tighter gap between title and subtitle
- Keeps the greeting more compact
- More likely to fit in keyboard viewport

---

## Visual Layout Comparison

### Before (Current - Space Between):
```
┌─────────────────────┐
│ CHATBOT Header      │ ← Scrolls off-screen
├─────────────────────┤
│ CHATBOT (huge)      │ ← Pushed off-screen
│ type, type, type    │ ← Hidden above fold
│                     │
│         ↕           │ ← Massive gap
│    (empty space)    │
│         ↕           │
│                     │
│ [📎] [Input] [SEND] │ ← Only this visible
└─────────────────────┘
  Keyboard here ⌨️
```

### After (Centered):
```
┌─────────────────────┐
│ CHATBOT Header      │ ← STAYS VISIBLE (sticky)
├─────────────────────┤
│                     │
│   CHATBOT (smaller) │ ← VISIBLE (centered)
│   type, type, type  │ ← VISIBLE
│         ↓ (1rem)    │ ← Compact gap
│ [📎] [Input] [SEND] │ ← VISIBLE
│                     │
└─────────────────────┘
  Keyboard here ⌨️
```

---

## Files to Modify

1. **`client/src/components/layout/Header/Header.module.css`**
   - Add `position: sticky` on mobile
   - Add `top: 0` and `z-index: 100`

2. **`client/src/components/chat/ChatContainer/ChatContainer.module.css`**
   - Change from `justify-content: space-between` to `justify-content: center`
   - Reduce gap from 1.5rem to 1rem
   - Change `flex: 1` to `flex: 0 1 auto` for emptyContent

3. **`client/src/components/chat/ChatContent/ChatContent.module.css`**
   - Reduce title size from 2.5rem to 2rem (768px breakpoint)
   - Further reduce to 1.75rem on very small screens (480px)
   - Add tighter spacing in `.emptyGreeting`

---

## Testing Checklist

### Header Visibility Tests
- [ ] Open app on iPhone
- [ ] Tap input field to open keyboard
- [ ] Verify header stays visible at top
- [ ] Verify header buttons (history, theme) remain accessible
- [ ] Test scrolling with keyboard open

### Greeting Visibility Tests
- [ ] Tap input to open keyboard
- [ ] Verify "CHATBOT" title is fully visible
- [ ] Verify "type, type, type" subtitle is visible
- [ ] Verify input field is visible
- [ ] Check on various keyboard sizes (with/without autocomplete bar)

### Layout Tests
- [ ] iPhone SE (375px) - smallest modern iPhone
- [ ] iPhone 13 (390px)
- [ ] iPhone 13 Pro Max (428px)
- [ ] Portrait orientation
- [ ] Landscape orientation (if applicable)

### Edge Cases
- [ ] Test with file attachments selected (extra UI below input)
- [ ] Test with very long input text
- [ ] Test keyboard dismiss/reappear
- [ ] Verify desktop layout unchanged

---

## Risk Assessment

**Low Risk:**
- Header sticky positioning (well-supported, easy to test)
- Gap/spacing reductions (visual only, easy to adjust)

**Medium Risk:**
- Layout change from space-between to center (significant behavioral change)
  - Mitigation: Test thoroughly on various devices
  - Rollback: Simple CSS change back to space-between

**Considerations:**
- iOS Safari has quirks with viewport units (vh) when keyboard opens
  - Using flexbox centering instead of fixed heights avoids this
- `position: sticky` is well-supported on iOS Safari 6.1+
- Changes are mobile-only, desktop unaffected

---

## Alternative Approach (If Sticky Header Doesn't Work)

If sticky positioning causes issues:

```css
@media (max-width: 768px) {
  .header {
    position: fixed; /* Fallback to fixed */
    top: 0;
    left: 0;
    right: 0;
    z-index: 100;
  }

  /* Add padding-top to main content to account for fixed header */
  .chatContainer,
  .chatContainerEmpty {
    padding-top: calc(56px + env(safe-area-inset-top)); /* Header height + safe area */
  }
}
```

---

## Success Criteria

After implementation:
- ✅ Header remains visible when keyboard opens
- ✅ "CHATBOT" title visible when keyboard opens
- ✅ "type, type, type" subtitle visible when keyboard opens
- ✅ Input field accessible and visible
- ✅ No content pushed off-screen
- ✅ Layout feels natural and centered
- ✅ Desktop experience unchanged
