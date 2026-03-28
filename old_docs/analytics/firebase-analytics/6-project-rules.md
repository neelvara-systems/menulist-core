# MenuListAI Firebase Analytics - Project Rules

## Overview
This document outlines the coding standards, architectural principles, and development guidelines for implementing the Firebase Analytics system in the MenuListAI platform. These rules ensure consistency, maintainability, and scalability of the analytics implementation.

## Technology Standards

### Framework & Language Requirements
- **Next.js (v14.2.5)** with **React (v18.3.1)** for the application framework
- **TypeScript (v5)** for all code to ensure type safety
- **Firebase (v10.5.0)** for backend services and analytics

### UI Components
- **Ant Design (v5.20.2)** for all dashboard UI components
- **@ant-design/plots (v1.2.5)** for data visualizations
- **Framer Motion (v10.16.4)** for animations and transitions

### State Management
- **Redux Toolkit (v1.9.7)** for global state management
- **Redux Persist (v6.0.0)** for persisting user preferences

## Code Organization

### Directory Structure
```
src/
├── components/
│   ├── templates/
│   │   ├── analytics/              # Analytics dashboard components
│   │   │   ├── AnalyticsDashboard.tsx
│   │   │   ├── OverallMetrics.tsx
│   │   │   └── ...
│   │   └── website/
│   │       ├── clientWebsite/      # Client website components with tracking
│   │       │   ├── index.tsx       # ClientMenuRenderer
│   │       │   ├── MenuItem.tsx    # Menu item with click tracking
│   │       │   └── ...
├── lib/
│   ├── analytics/                  # Analytics utilities
│   │   ├── client.ts               # Client-side tracking functions
│   │   ├── session.ts              # Session management
│   │   ├── types.ts                # TypeScript interfaces
│   │   ├── device.ts               # Device detection utilities
│   │   └── geo.ts                  # Geolocation utilities
│   └── firebase/
│       ├── admin.ts                # Firebase Admin SDK initialization
│       └── client.ts               # Firebase client SDK initialization
├── pages/
│   ├── api/
│   │   └── analytics/
│   │       ├── track.ts            # Event tracking endpoint
│   │       └── reports.ts          # Data retrieval endpoint
│   └── ...
├── hooks/
│   └── useAnalyticsData.ts         # Custom hook for fetching analytics data
└── ...
```

### Naming Conventions
1. **Files & Components**:
   - Use PascalCase for React components: `AnalyticsDashboard.tsx`
   - Use camelCase for utility files: `client.ts`
   - Use kebab-case for documentation files: `firebase-analytics.md`

2. **Functions & Variables**:
   - Use camelCase for functions and variables: `trackEvent`, `sessionId`
   - Use PascalCase for types and interfaces: `AnalyticsEventType`
   - Use UPPER_SNAKE_CASE for constants: `MAX_ITEMS_LIMIT`

3. **Database Paths**:
   - Use camelCase for collection and document names: `dailyAnalytics`, `analyticsOverall`
   - Use ISO date format (YYYY-MM-DD) for date-based document IDs: `2025-04-06`

## Coding Standards

### TypeScript
1. **Type Safety**:
   - Define interfaces for all data structures
   - Avoid using `any` type
   - Use proper type guards for conditional logic

2. **Example**:
   ```typescript
   // Good
   interface AnalyticsEvent {
     eventType: 'menuView' | 'itemClick';
     storeId: string;
     tenantId: string;
     sessionId: string;
   }
   
   function trackEvent(event: AnalyticsEvent): void {
     // Implementation
   }
   
   // Bad
   function trackEvent(eventType: any, storeId: any, data: any): void {
     // Implementation
   }
   ```

### React Components
1. **Functional Components**:
   - Use functional components with hooks
   - Implement proper memoization for expensive calculations
   - Keep components focused on a single responsibility

2. **Example**:
   ```typescript
   // Good
   const DeviceBreakdown: React.FC<{ daily: DailyAnalytics[] }> = React.memo(({ daily }) => {
     const deviceData = useMemo(() => calculateDeviceData(daily), [daily]);
     
     return (
       <Card title="Device Breakdown">
         <Pie data={deviceData} />
       </Card>
     );
   });
   
   // Bad
   class DeviceBreakdown extends React.Component {
     render() {
       const deviceData = this.calculateDeviceData(); // Recalculated on every render
       
       return (
         <Card title="Device Breakdown">
           <Pie data={deviceData} />
           <LocationBreakdown /> {/* Unrelated responsibility */}
         </Card>
       );
     }
   }
   ```

### API Routes
1. **Request Validation**:
   - Validate all incoming request parameters
   - Return appropriate HTTP status codes for errors
   - Use try/catch blocks for error handling

2. **Example**:
   ```typescript
   // Good
   export default async function handler(req: NextApiRequest, res: NextApiResponse) {
     if (req.method !== 'POST') {
       return res.status(405).json({ error: 'Method not allowed' });
     }
     
     try {
       const { eventType, storeId, tenantId } = req.body;
       
       if (!eventType || !storeId || !tenantId) {
         return res.status(400).json({ error: 'Missing required fields' });
       }
       
       // Process request
       
       res.status(200).json({ success: true });
     } catch (error) {
       console.error('Error:', error);
       res.status(500).json({ error: 'Internal server error' });
     }
   }
   ```

### Firebase & Firestore
1. **Data Access**:
   - Use appropriate security rules for all collections
   - Implement proper indexing for queries
   - Use batch operations for multiple updates
   - Use transactions for operations that need atomicity

2. **Example**:
   ```typescript
   // Good
   const batch = admin.firestore().batch();
   
   // Update multiple documents in a batch
   stores.forEach(storeId => {
     const docRef = admin.firestore()
       .collection('tenants')
       .doc(tenantId)
       .collection('stores')
       .doc(storeId)
       .collection('analyticsOverall')
       .doc('summary');
     
     batch.update(docRef, { lastUpdated: admin.firestore.FieldValue.serverTimestamp() });
   });
   
   await batch.commit();
   ```

## Performance Guidelines

### Client-Side Performance
1. **Asynchronous Tracking**:
   - Analytics tracking should never block the main thread
   - Use non-blocking fetch requests with `keepalive: true`
   - Implement debouncing for high-frequency events

2. **Component Optimization**:
   - Use React.memo for pure components
   - Implement useMemo for expensive calculations
   - Use lazy loading for analytics dashboard components

3. **Example**:
   ```typescript
   // Good
   const trackEvent = (eventType, data) => {
     // Use setTimeout to move to the next event loop tick
     setTimeout(() => {
       fetch('/api/analytics/track', {
         method: 'POST',
         body: JSON.stringify({ eventType, ...data }),
         keepalive: true
       }).catch(console.error); // Silent fail
     }, 0);
   };
   ```

### Server-Side Performance
1. **Firestore Optimization**:
   - Use appropriate indexes for all queries
   - Limit document size to avoid 1MB limit
   - Use aggregation to reduce document count
   - Implement data retention policies

2. **API Route Optimization**:
   - Implement caching for geolocation lookups
   - Use efficient data structures for processing
   - Minimize external API calls

3. **Example**:
   ```typescript
   // Good - Caching geolocation lookups
   const geoCache = {};
   
   async function getLocationFromIp(ip) {
     if (geoCache[ip]) {
       return geoCache[ip]; // Return cached result
     }
     
     const location = await lookupIp(ip);
     geoCache[ip] = location; // Cache for future use
     
     return location;
   }
   ```

## Security Guidelines

### Data Privacy
1. **Personal Information**:
   - Do not store personally identifiable information (PII)
   - Do not store raw IP addresses
   - Anonymize user data where possible

2. **Access Control**:
   - Implement proper authentication for all analytics endpoints
   - Restrict access to analytics data based on user roles
   - Store owners should only see their own store's analytics

3. **Example**:
   ```typescript
   // Good - Role-based access control
   export default async function handler(req: NextApiRequest, res: NextApiResponse) {
     // Get user from session
     const session = await getSession({ req });
     
     if (!session || !session.user) {
       return res.status(401).json({ error: 'Unauthorized' });
     }
     
     const { storeId } = req.query;
     
     // Check if user has access to this store
     if (!userHasAccessToStore(session.user, storeId)) {
       return res.status(403).json({ error: 'Forbidden' });
     }
     
     // Continue with request
   }
   ```

## Testing Requirements

### Unit Testing
1. **Test Coverage**:
   - All utility functions must have unit tests
   - Test tracking functions with mocked fetch
   - Test data processing functions with sample data

2. **Example**:
   ```typescript
   // Example test for tracking function
   describe('trackEvent', () => {
     beforeEach(() => {
       global.fetch = jest.fn().mockResolvedValue({ ok: true });
     });
     
     it('should call the tracking endpoint with correct data', async () => {
       await trackEvent('menuView', { storeId: '123', tenantId: '456' });
       
       expect(global.fetch).toHaveBeenCalledWith(
         '/api/analytics/track',
         expect.objectContaining({
           method: 'POST',
           body: expect.stringContaining('menuView')
         })
       );
     });
   });
   ```

### Integration Testing
1. **API Routes**:
   - Test all API routes with sample requests
   - Verify correct Firestore updates
   - Test error handling and edge cases

2. **Dashboard Components**:
   - Test data fetching and rendering
   - Test user interactions and filters
   - Test responsiveness on different screen sizes

## Documentation Requirements

### Code Documentation
1. **Comments**:
   - Add JSDoc comments for all functions
   - Document complex logic and algorithms
   - Explain non-obvious implementation details

2. **Example**:
   ```typescript
   /**
    * Tracks an analytics event by sending it to the API endpoint.
    * 
    * @param eventType - Type of event ('menuView' or 'itemClick')
    * @param data - Event data including storeId, tenantId, and sessionId
    * @returns Promise that resolves when the request completes
    */
   export async function trackEvent(
     eventType: AnalyticsEventType,
     data: EventData
   ): Promise<void> {
     // Implementation
   }
   ```

### User Documentation
1. **Dashboard Guide**:
   - Create user guide for store owners
   - Explain metrics and visualizations
   - Provide examples of insights and actions

2. **Developer Documentation**:
   - Document API endpoints and parameters
   - Explain data structure and relationships
   - Provide integration examples

## Deployment Guidelines

### Environment Variables
1. **Required Variables**:
   - No hardcoded values in the codebase
   - Use environment variables for configuration
   - Document all required variables

2. **Example**:
   ```
   # .env.local example
   NEXT_PUBLIC_FIREBASE_API_KEY=your-api-key
   NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your-auth-domain
   NEXT_PUBLIC_FIREBASE_PROJECT_ID=your-project-id
   FIREBASE_ADMIN_PRIVATE_KEY=your-private-key
   FIREBASE_ADMIN_CLIENT_EMAIL=your-client-email
   ```

### Deployment Checklist
1. **Pre-Deployment**:
   - Run all tests
   - Verify all environment variables
   - Check for hardcoded values
   - Validate Firestore indexes

2. **Post-Deployment**:
   - Verify tracking is working
   - Check dashboard is displaying data
   - Monitor for errors and performance issues

## Collaboration Guidelines

### Git Workflow
1. **Branching Strategy**:
   - Use feature branches for new features
   - Use fix branches for bug fixes
   - Use release branches for releases

2. **Commit Messages**:
   - Use conventional commit format
   - Include ticket/issue number if applicable
   - Be descriptive but concise

3. **Example**:
   ```
   feat(analytics): add device breakdown component
   
   - Implements pie chart for device type visualization
   - Adds filtering by date range
   - Connects to Firestore data source
   
   Refs: #123
   ```

### Code Review
1. **Review Checklist**:
   - Code follows project standards
   - All tests pass
   - No security vulnerabilities
   - Performance considerations addressed
   - Documentation updated

## Maintenance Guidelines

### Monitoring
1. **Error Tracking**:
   - Log all errors with context
   - Set up alerts for critical errors
   - Monitor API endpoint performance

2. **Usage Metrics**:
   - Track Firestore read/write operations
   - Monitor document sizes
   - Track API endpoint usage

### Data Management
1. **Data Retention**:
   - Implement policy for old analytics data
   - Consider aggregating older data
   - Balance storage costs with data availability

2. **Backup Strategy**:
   - Regular Firestore backups
   - Document recovery procedures
   - Test restoration process
