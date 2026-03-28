/**
 * Session management for analytics tracking
 */
import { v4 as uuidv4 } from 'uuid';

const SESSION_ID_KEY = 'menulist_session_id';
const SESSION_TIMESTAMP_KEY = 'menulist_session_timestamp';
const SESSION_TIMEOUT_MS = 30 * 60 * 1000; // 30 minutes

/**
 * Gets the current session ID or creates a new one if needed
 * @returns Current session ID
 */
export function getSessionId(): string {
  // Skip if not in browser
  if (typeof window === 'undefined') {
    return 'server-side';
  }

  try {
    const existingId = sessionStorage.getItem(SESSION_ID_KEY);
    const timestampStr = sessionStorage.getItem(SESSION_TIMESTAMP_KEY);
    
    // Check if we have an existing session
    if (existingId && timestampStr) {
      const timestamp = parseInt(timestampStr, 10);
      const now = Date.now();
      
      // If session hasn't expired, update timestamp and return existing ID
      if (now - timestamp < SESSION_TIMEOUT_MS) {
        sessionStorage.setItem(SESSION_TIMESTAMP_KEY, now.toString());
        return existingId;
      }
    }
    
    // Create new session
    const newId = uuidv4();
    sessionStorage.setItem(SESSION_ID_KEY, newId);
    sessionStorage.setItem(SESSION_TIMESTAMP_KEY, Date.now().toString());
    
    return newId;
  } catch (error) {
    // Fallback in case sessionStorage is not available
    console.error('Error accessing sessionStorage:', error);
    return uuidv4();
  }
}

/**
 * Refreshes the current session timestamp
 */
export function refreshSession(): void {
  if (typeof window === 'undefined') {
    return;
  }
  
  try {
    const existingId = sessionStorage.getItem(SESSION_ID_KEY);
    if (existingId) {
      sessionStorage.setItem(SESSION_TIMESTAMP_KEY, Date.now().toString());
    }
  } catch (error) {
    console.error('Error refreshing session:', error);
  }
}

/**
 * Clears the current session
 */
export function clearSession(): void {
  if (typeof window === 'undefined') {
    return;
  }
  
  try {
    sessionStorage.removeItem(SESSION_ID_KEY);
    sessionStorage.removeItem(SESSION_TIMESTAMP_KEY);
  } catch (error) {
    console.error('Error clearing session:', error);
  }
}
