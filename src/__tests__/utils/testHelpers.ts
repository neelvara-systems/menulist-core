/**
 * Test Utilities and Helpers
 * Common utilities for testing analytics components
 */

import type { ReactElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

// ================================================================
// MOCK DATA GENERATORS
// ================================================================

/**
 * Generate mock analytics data
 */
export function generateMockAnalytics(days: number = 30) {
  const data = [];
  const today = new Date();

  for (let i = days - 1; i >= 0; i--) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);

    data.push({
      date: date.toISOString().split('T')[0],
      totalChats: Math.floor(Math.random() * 100) + 50,
      satisfactionRate: Math.floor(Math.random() * 30) + 70,
      avgMessagesPerChat: Math.random() * 3 + 2,
      positiveFeedback: Math.floor(Math.random() * 50) + 20,
      negativeFeedback: Math.floor(Math.random() * 20) + 5,
    });
  }

  return data;
}

/**
 * Generate mock health report
 */
export function generateMockHealthReport() {
  return {
    overall: 'healthy' as const,
    timestamp: new Date(),
    components: [
      {
        component: 'Firestore',
        status: 'healthy' as const,
        lastCheck: new Date(),
        responseTime: 125,
        uptime: 99.9,
      },
      {
        component: 'AI Services',
        status: 'healthy' as const,
        lastCheck: new Date(),
        responseTime: 450,
      },
    ],
    summary: {
      healthyCount: 2,
      degradedCount: 0,
      downCount: 0,
      avgResponseTime: 287.5,
    },
  };
}

/**
 * Generate mock notifications
 */
export function generateMockNotifications(count: number = 5) {
  const types = ['success', 'warning', 'error', 'info'] as const;
  const notifications = [];

  for (let i = 0; i < count; i++) {
    notifications.push({
      id: `notification-${i}`,
      type: types[Math.floor(Math.random() * types.length)],
      title: `Test Notification ${i + 1}`,
      message: `This is a test message for notification ${i + 1}`,
      timestamp: new Date(Date.now() - i * 3600000),
      read: Math.random() > 0.5,
    });
  }

  return notifications;
}

// ================================================================
// TEST ASSERTIONS
// ================================================================

/**
 * Assert chart data is valid
 */
export function assertValidChartData(data: unknown[]): void {
  expect(Array.isArray(data)).toBe(true);
  expect(data.length).toBeGreaterThan(0);

  data.forEach(item => {
    expect(item).toBeTruthy();
    expect(typeof item).toBe('object');
    expect(item).toHaveProperty('date');
    expect(typeof (item as { date?: unknown }).date).toBe('string');
  });
}

/**
 * Assert component renders without error
 */
export function assertComponentRenders(component: ReactElement): void {
  expect(() => renderToStaticMarkup(component)).not.toThrow();
}

// ================================================================
// MOCK FUNCTIONS
// ================================================================

/**
 * Mock SWR hook
 */
export function mockUseSWR<T>(data: T | undefined, error: unknown = null) {
  return {
    data,
    error,
    isLoading: !data && !error,
    isValidating: false,
    mutate: jest.fn(),
  };
}

/**
 * Mock API call
 */
export function mockApiCall<T>(response: T, delay: number = 100): Promise<T> {
  return new Promise(resolve => {
    setTimeout(() => resolve(response), delay);
  });
}

// ================================================================
// TEST SETUP
// ================================================================

/**
 * Setup test environment
 */
export function setupTests() {
  // Mock window.matchMedia
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: jest.fn().mockImplementation(query => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: jest.fn(),
      removeListener: jest.fn(),
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
      dispatchEvent: jest.fn(),
    })),
  });

  // Mock IntersectionObserver
  global.IntersectionObserver = class IntersectionObserver {
    constructor() {}
    disconnect() {}
    observe() {}
    takeRecords() {
      return [];
    }
    unobserve() {}
  } as unknown as typeof IntersectionObserver;
}

// ================================================================
// EXPORTS
// ================================================================

export default {
  generateMockAnalytics,
  generateMockHealthReport,
  generateMockNotifications,
  assertValidChartData,
  assertComponentRenders,
  mockUseSWR,
  mockApiCall,
  setupTests,
};
