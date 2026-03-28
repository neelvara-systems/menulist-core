import { SearchDisplayResultDataType } from './types';

export type State = {
    status: 'idle' | 'loading' | 'typing' | 'success' | 'error';
    data: SearchDisplayResultDataType | null;
    error: string | null;
    lastQuery: string;
    displayedAnswer: string;
};

export type Action =
    | { type: 'SEARCH_START'; payload: { query: string } }
    | { type: 'SEARCH_SUCCESS'; payload: SearchDisplayResultDataType }
    | { type: 'SEARCH_ERROR'; payload: string }
    | { type: 'TYPING_UPDATE'; payload: string }
    | { type: 'TYPING_COMPLETE' }
    | { type: 'SKIP_TYPING' }
    | { type: 'CLEAR' };

export const initialState: State = {
    status: 'idle',
    data: null,
    error: null,
    lastQuery: '',
    displayedAnswer: '',
};

export function reducer(state: State, action: Action): State {
    switch (action.type) {
        case 'SEARCH_START':
            return {
                ...initialState,
                status: 'loading',
                lastQuery: action.payload.query,
            };
        case 'SEARCH_SUCCESS':
            return {
                ...state,
                status: 'typing',
                data: action.payload,
                error: null,
            };
        case 'SEARCH_ERROR':
            return {
                ...state,
                status: 'error',
                error: action.payload,
            };
        case 'TYPING_UPDATE':
            return {
                ...state,
                displayedAnswer: state.displayedAnswer + action.payload,
            };
        case 'TYPING_COMPLETE':
            return {
                ...state,
                status: 'success',
            };
        case 'SKIP_TYPING':
            return {
                ...state,
                status: 'success',
                displayedAnswer: state.data?.craftedAnswer || '',
            };
        case 'CLEAR':
            return initialState;
        default:
            return state;
    }
}
