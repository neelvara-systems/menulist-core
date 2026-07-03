# Help Chat System - Dual-Mode Help Assistant

## 🎯 Overview
A production help interface designed for non-technical owners. It supports QnA (quick answers) and Assistant (conversational) modes, uses the Answerlattice-backed search API, persists chat sessions through the local HelpChat data hooks, and keeps failure diagnostics bounded through `helpChatDiagnostics.ts`.

## ✨ Key Features

### User Experience
- **Clean, Modern UI** - Large border radius (16-20px), spacious layouts
- **Friendly Messaging** - Warm, emoji-enhanced responses
- **Typing Indicator** - Animated dots showing AI is working
- **Smooth Animations** - Framer Motion transitions throughout
- **Tooltips** - Helpful guidance on all interactive elements

### Dual Modes
1. **QnA Mode** (Stateless)
   - Quick, one-time questions
   - Each query creates new chat session
   - Perfect for simple lookups

2. **Assistant Mode** (Conversational)
   - Context-aware responses
   - Maintains conversation history
   - Ideal for complex, multi-step help

### Components

#### Main Components
- `index.tsx` - Modal container with state management
- `ChatPanel.tsx` - Main chat interface with mode toggle
- `ChatHistory.tsx` - Left sidebar with conversation list
- `ChatInput.tsx` - Message input with AI button
- `MessageBubble.tsx` - Individual message display
- `LocalSearchResults.tsx` - Local documentation result display
- `ModeToggle.tsx` - QnA/Assistant switcher
- `TypingIndicator.tsx` - Animated typing indicator
- `ChatErrorBoundary.tsx` - Friendly fallback for render failures

#### Supporting Files
- `types.ts` - TypeScript definitions
- `api.ts` / `apiTypes.ts` - HelpChat search API client and response types
- `chatState.ts` - Reducer state for search/typing/error UI
- `chatUtils.ts` - Draft cleanup helpers
- `helpChatDiagnostics.ts` - Bounded secure diagnostics for client failures
- `hooks/useChatData.ts` - Session/category loading
- `hooks/useChatHandlers.ts` - Send, retry, feedback, and ticket escalation handlers
- `hooks/useRequestQueue.ts` - Request queueing support

## 🎨 Design System

### Border Radius
- Modal: 20px
- Cards: 16px (main), 12px (nested)
- Buttons: 16px (primary), 8px (small)
- Avatars: 50% (circle)

### Spacing
- Container padding: 20px
- Card gaps: 8-12px
- Message spacing: 16px

### Colors
- Uses Ant Design token system
- Gradient icons with glow effects
- Subtle borders (`colorBorderSecondary`)

## 📝 User Journey

### Pre-Conversation
1. Modal opens with centered welcome screen
2. Gradient AI icon with glow effect
3. Friendly greeting with wave emoji
4. 3 example prompt pills
5. As user types → Live search results appear
6. User can click result OR "Ask AI"

### Active Conversation
1. User message appears on right
2. Typing indicator shows (1.5s)
3. AI response appears with references
4. Action buttons (helpful/copy/regenerate)
5. Auto-scroll to latest message

### History Management
- Sessions sorted by `modifiedOn`
- Mode badges (QnA/Assistant)
- Message count display
- Active session highlighting

## 🔄 State Management

### Chat Sessions
```typescript
{
  id: string
  title: string
  mode: 'qna' | 'assistant'
  messages: ChatMessage[]
  createdOn: Date
  modifiedOn: Date
}
```

### Messages
```typescript
{
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
  references?: ChatReference[]
}
```

## 🚀 Runtime Integration Points

### Backend Integration
- Chat search goes through the HelpChat API client in `api.ts`
- Session/category persistence flows through `useChatData`
- Send/retry/feedback/ticket escalation/message-copy flows through `useChatHandlers`
- Render-failure, draft, search, retry, session-persist, message-copy, and feedback diagnostics use `helpChatDiagnostics.ts`

### Features to Add
- Message editing
- Conversation export
- Advanced search filters
- Voice input
- File attachments
- Conversation sharing

## 💡 Best Practices

### For Non-Tech Users
- Use emojis sparingly but meaningfully
- Keep language simple and friendly
- Provide visual feedback for all actions
- Show progress indicators
- Offer clear next steps

### Performance
- Messages lazy load with virtualization
- Debounced search input
- Optimized re-renders with React.memo
- Smooth 60fps animations

## 🛠️ Development Notes

### Adding New Features
1. Follow existing component structure
2. Use Ant Design tokens for styling
3. Add TypeScript types in `types.ts`
4. Keep components focused and small
5. Use Lucide icons from react-icons/lu

### Testing Checklist
- [ ] Modal opens/closes smoothly
- [ ] Mode toggle works correctly
- [ ] Typing indicator shows/hides
- [ ] Search results filter properly
- [ ] Messages scroll automatically
- [ ] Action buttons provide feedback
- [ ] Empty states are friendly
- [ ] Mobile responsive (future)

## 📱 Responsive Design
- Sidebar collapses on mobile
- Touch-optimized buttons
- Full-screen on small devices
- Mobile history opens in a drawer

---

**Built for non-technical owners**
