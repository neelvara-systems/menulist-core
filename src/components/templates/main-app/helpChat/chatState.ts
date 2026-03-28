
export type ChatStatus = 'idle' | 'loading' | 'typing' | 'success' | 'error';

export type ChatState = {
    status: ChatStatus;
    error: string | null;
    lastQuery: string;
    typingMessageId: string | null; // ID of message currently being typed (animation handled locally in MessageBubble)
};

export type ChatAction =
    | { type: 'SEARCH_START'; payload: { query: string } }
    | { type: 'SEARCH_SUCCESS'; payload: { messageId: string } }
    | { type: 'SEARCH_ERROR'; payload: string }
    | { type: 'TYPING_COMPLETE' }
    | { type: 'SKIP_TYPING' }
    | { type: 'CLEAR' }
    | { type: 'RESET' };

export const initialChatState: ChatState = {
    status: 'idle',
    error: null,
    lastQuery: '',
    typingMessageId: null,
};

export function chatReducer(state: ChatState, action: ChatAction): ChatState {
    switch (action.type) {
        case 'SEARCH_START':
            return {
                ...state,
                status: 'loading',
                lastQuery: action.payload.query,
                error: null,
            };
        case 'SEARCH_SUCCESS':
            return {
                ...state,
                status: 'typing',
                typingMessageId: action.payload.messageId,
                error: null,
            };
        case 'SEARCH_ERROR':
            return {
                ...state,
                status: 'error',
                error: action.payload,
                typingMessageId: null,
            };
        case 'TYPING_COMPLETE':
            return {
                ...state,
                status: 'success',
                typingMessageId: null,
            };
        case 'SKIP_TYPING':
            return {
                ...state,
                status: 'success',
                typingMessageId: null,
            };
        case 'CLEAR':
        case 'RESET':
            return initialChatState;
        default:
            return state;
    }
}
