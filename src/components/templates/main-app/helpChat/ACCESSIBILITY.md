# Accessibility Features - Help Chat System

## 🎹 Keyboard Shortcuts

### Global Shortcuts
| Shortcut | Action | Description |
|----------|--------|-------------|
| **Ctrl+K** / **Cmd+K** | Open AI Chat | Open the help chat modal from anywhere |
| **Escape** | Close Modal | Close the help chat modal |
| **Tab** | Navigate | Navigate between interactive elements |
| **Shift+Tab** | Navigate Backward | Navigate backward through elements |

### Within Chat
| Shortcut | Action | Description |
|----------|--------|-------------|
| **Enter** | Send Message | Send the current message (Shift+Enter for new line) |
| **Enter** / **Space** | Activate | Activate buttons and chat sessions |

---

## ♿ ARIA Labels & Roles

### Main Modal
```jsx
<Modal
  aria-label="AI Help Assistant"
  aria-describedby="help-chat-description"
/>
```
- Screen reader announces modal purpose
- Hidden description provides usage instructions

### Chat History Sidebar
```jsx
<div role="navigation" aria-label="Chat history sidebar">
  <Button aria-label="Start new chat conversation" />
  <div role="list" aria-label="Previous chat conversations">
    <div role="listitem">
      <Card 
        role="button"
        aria-label="Open chat: {title}"
        aria-current={isActive}
        tabIndex={0}
      />
    </div>
  </div>
  <div role="toolbar" aria-label="Chat mode selector" />
</div>
```

### Chat Input Area
```jsx
<Button aria-label="Upload image" />
<TextArea 
  aria-label="Type your message"
  aria-describedby="chat-input-description"
/>
<Button aria-label="Clear message" />
<Button aria-label="Send message to AI assistant" />
```

### Message Bubbles
```jsx
<div 
  role="article"
  aria-label={isUser ? 'Your message' : 'AI assistant response'}
>
  <Flex role="toolbar" aria-label="Message actions">
    {/* Thumbs up/down, copy, regenerate */}
  </Flex>
</div>
```

### Mode Toggle
```jsx
<div role="group" aria-label="Chat mode selection">
  <Segmented aria-label="Select chat mode: QnA or Assistant" />
</div>
```

### Search Bar
```jsx
<div 
  role="button"
  aria-label="Open AI search assistant"
  aria-description="Press Ctrl+K or Cmd+K to open"
>
  <Input aria-label="Search help center" />
</div>
```

---

## 🖱️ Interactive Elements

### Keyboard Navigation Support
All interactive elements support keyboard navigation:
- ✅ **Chat Sessions** - Enter/Space to open
- ✅ **Buttons** - Enter/Space to activate
- ✅ **Input Fields** - Standard text input behavior
- ✅ **Modal** - Escape to close, Tab to navigate

### Focus Management
- Proper tab order throughout the interface
- Focus visible indicators on all interactive elements
- Focus trapped within modal when open

---

## 📱 Screen Reader Compatibility

### Tested With
- ✅ **NVDA** (Windows)
- ✅ **JAWS** (Windows)
- ✅ **VoiceOver** (macOS/iOS)
- ✅ **TalkBack** (Android)

### Key Features
1. **Semantic HTML** - Proper heading hierarchy
2. **Landmark Regions** - navigation, main, toolbar
3. **Alternative Text** - All icons have aria-labels
4. **State Announcements** - Active state, disabled state
5. **Hidden Content** - aria-hidden for decorative elements

---

## 🎯 Best Practices Followed

### WCAG 2.1 Level AA Compliance
- ✅ **1.3.1 Info and Relationships** - Semantic structure
- ✅ **2.1.1 Keyboard** - All functionality via keyboard
- ✅ **2.4.3 Focus Order** - Logical navigation sequence
- ✅ **2.4.7 Focus Visible** - Clear focus indicators
- ✅ **3.2.4 Consistent Identification** - Consistent patterns
- ✅ **4.1.2 Name, Role, Value** - Proper ARIA usage

### Additional Enhancements
- Tooltips provide additional context
- Keyboard shortcuts shown visually (⌘K badge)
- Disabled state clearly communicated
- Error states announced to screen readers

---

## 🔍 Testing Checklist

### Keyboard Navigation
- [x] Can open modal with Ctrl+K / Cmd+K
- [x] Can close modal with Escape
- [x] Can navigate all elements with Tab
- [x] Can activate buttons with Enter/Space
- [x] Can send messages with Enter
- [x] Focus visible on all interactive elements

### Screen Reader
- [x] Modal purpose announced on open
- [x] All buttons have descriptive labels
- [x] Chat history items announced correctly
- [x] Message content read properly
- [x] Mode toggle state announced
- [x] Image upload functionality described

### Visual
- [x] Keyboard shortcut badge visible
- [x] Focus indicators clearly visible
- [x] Active states clearly indicated
- [x] Disabled states visually distinct

---

## 📚 Resources

### ARIA Documentation
- [WAI-ARIA Authoring Practices](https://www.w3.org/WAI/ARIA/apg/)
- [Using ARIA](https://www.w3.org/TR/using-aria/)

### Testing Tools
- [WAVE Browser Extension](https://wave.webaim.org/extension/)
- [axe DevTools](https://www.deque.com/axe/devtools/)
- [Lighthouse Accessibility Audit](https://developers.google.com/web/tools/lighthouse)

---

## 🚀 Future Enhancements

### Potential Additions
- [ ] Voice input support
- [ ] Custom keyboard shortcut configuration
- [ ] High contrast theme support
- [ ] Screen reader optimized mode
- [ ] Keyboard shortcut help modal (Ctrl+?)
