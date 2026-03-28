# Ticket System — Firebase Cost & Operations Tracking

> **Version:** 1.0.0
> **Last Updated:** 2026-03-02
> **Audience:** Developers, Ops
> **Source:** Codebase forensic audit

---

## 1. Firestore Collection

| Property | Value |
|----------|-------|
| **Collection** | `supportTickets` |
| **DB_COLLECTIONS constant** | `DB_COLLECTIONS.SUPPORT_TICKETS` |
| **Doc ID** | Auto-generated (Firestore) |
| **Display ID** | First 6 chars of doc ID, uppercased |
| **Scoping** | `tId` + `sId` fields (tenant + store) |
| **Avg Doc Size** | 2-50 KB (grows with messages + attachments) |
| **Growth Rate** | Per-ticket submission |
| **Soft Delete** | `deleted: true` field (not hard delete from UI) |

### Document Schema

```typescript
{
  id: string;                    // Firestore auto-ID
  displayId: string;             // First 6 chars, uppercase
  subject: string;
  status: string;                // Open | In Progress | Resolved | Closed | Re-Opened
  priority: string;              // Low | Normal | High
  category: string;              // 7 categories
  message: string;               // Initial description
  documents: Array<{             // File attachments
    name: string;
    size: number;
    type: string;
    url: string;                 // Firebase Storage URL
    uid: string;
  }>;
  platformNotes: string;         // Admin internal notes
  platformTags: string[];        // Admin tags [Issue, Bug, Feature, Improvement, Performance]
  deleted: boolean;              // Soft delete flag
  statuses: Array<{              // Status audit trail
    status: string;
    timestamp: Timestamp;
    createdBy: { id, name, email };
    remark: string;
  }>;
  messages: Array<{              // Conversation thread
    id: string;
    text: string;
    type: 'user' | 'system';
    sender: { id, name, email };
    timestamp: Timestamp;
    attachments?: Array<{ url, name, type, size }>;
  }>;
  clientDetails: {               // Requester info (captured on creation)
    storeName: string;
    tenantName: string;
    email: string;
    phone: string;
  };
  logs: Array<{                  // Captured browser logs
    timestamp: number;
    message: string;
    level: 'info' | 'warn' | 'error';
  }>;
  // Auto-injected by requestBodyComposer:
  createdOn: Timestamp;
  modifiedOn: Timestamp;
  createdBy: string;
  modifiedBy: string;
  sId: string;
  tId: string;
  uId: string;
}
```

---

## 2. Firebase Storage

### Paths

| Purpose | Path Pattern | Tenant-Scoped |
|---------|-------------|:-------------:|
| Ticket attachments | `supportTickets/documents/{tId}/{sId}/{timestamp}-{uid}` | ✅ |
| Message attachments | `supportTickets/messages/{tId}/{sId}/{timestamp}-{uid}` | ✅ |

### Storage Operations

| Operation | When | Size |
|-----------|------|------|
| Upload attachment | Ticket creation / message reply | 0-10 MB per file, max 4 files |
| Delete attachment | Hard delete ticket (DAL `deleteTicket`) | Deletes all associated files |

---

## 3. Operations Per Action

### 3.1 Create Ticket

| Step | Reads | Writes | Storage |
|------|:-----:|:------:|:-------:|
| `requestBodyComposer` | 0 | 0 | — |
| Upload attachments (0-4 files) | 0 | 0 | 0-4 files |
| `addDoc` to supportTickets | 0 | 1 | — |
| **Total** | **0** | **1** | **0-4 files** |

### 3.2 Send Message

| Step | Reads | Writes | Storage |
|------|:-----:|:------:|:-------:|
| Upload attachments (optional) | 0 | 0 | 0-N files |
| `setDoc` merge (append to messages) | 0 | 1 | — |
| **Total** | **0** | **1** | **0-N files** |

### 3.3 Update Ticket (Status/Priority/Category/Notes/Tags)

| Step | Reads | Writes |
|------|:-----:|:------:|
| `setDoc` merge | 0 | 1 |
| **Total** | **0** | **1** |

### 3.4 Soft Delete

| Step | Reads | Writes |
|------|:-----:|:------:|
| `updateTicket({ deleted: true })` | 0 | 1 |
| **Total** | **0** | **1** |

### 3.5 Hard Delete (DAL only)

| Step | Reads | Writes | Storage |
|------|:-----:|:------:|:-------:|
| Delete all storage files | 0 | 0 | N deletes |
| `deleteDoc` | 0 | 1 | — |
| **Total** | **0** | **1** | **N deletes** |

### 3.6 Get Store Tickets (Owner)

| Step | Reads | Writes |
|------|:-----:|:------:|
| Query: `tId + sId + deleted=false + orderBy createdOn desc` | N | 0 |
| **Total** | **N** | **0** |

### 3.7 Get All Tickets (Platform Admin)

| Step | Reads | Writes |
|------|:-----:|:------:|
| Query: `deleted=false + orderBy createdOn desc` (or all if includeDeleted) | N | 0 |
| **Total** | **N (entire collection)** | **0** |

### 3.8 Real-Time Subscription (Owner)

| Step | Reads | Writes |
|------|:-----:|:------:|
| Initial snapshot | N (store-scoped) | 0 |
| Per change | 1 (changed doc) | 0 |
| **Per hour (estimated)** | **~5-20** | **0** |

### 3.9 Real-Time Subscription (Platform)

| Step | Reads | Writes |
|------|:-----:|:------:|
| Initial snapshot | N (all tickets) | 0 |
| Per change | 1 (changed doc) | 0 |

---

## 4. Firestore Indexes Required

| Fields | Order | Purpose |
|--------|-------|---------|
| `tId ASC, sId ASC, deleted ASC, createdOn DESC` | Composite | Store-scoped ticket list |
| `deleted ASC, createdOn DESC` | Composite | Platform-wide ticket list |

---

## 5. Cost Estimates

### Scenario: 10 stores, 5 tickets/week, 3 messages/ticket

| Operation | Frequency | Reads/mo | Writes/mo |
|-----------|-----------|:--------:|:---------:|
| Create ticket | 50/mo | 0 | 50 |
| Send messages | 150/mo | 0 | 150 |
| Status updates | 100/mo | 0 | 100 |
| Owner view loads (cache 5min) | ~300/mo | 300 × ~5 = 1,500 | 0 |
| Platform admin loads | ~100/mo | 100 × ~50 = 5,000 | 0 |
| Real-time listener (owner) | Continuous | ~3,000 | 0 |
| Real-time listener (platform) | Continuous | ~2,000 | 0 |
| **Total** | | **~11,500** | **~300** |

### Monthly Cost

| Resource | Usage | Cost |
|----------|-------|------|
| Firestore reads | ~11,500 | $0.004 |
| Firestore writes | ~300 | $0.0003 |
| Storage | ~25 MB/mo | ~$0.003 |
| **Total** | | **~$0.007/month** |

**At 1,000 stores:** ~$0.70/month

---

## 6. DAL Function → Collection Mapping

| DAL Function | Collection | Operation | Cost Pattern |
|-------------|-----------|-----------|-------------|
| `addTicket` | `supportTickets` | addDoc | 1W + N storage |
| `updateTicket` | `supportTickets` | setDoc merge | 1W |
| `addTicketMessage` | `supportTickets` | setDoc merge | 1W + N storage |
| `updateTicketStatus` | `supportTickets` | setDoc merge | 1W |
| `deleteTicket` | `supportTickets` | deleteDoc | 1W + N storage deletes |
| `restoreTicket` | `supportTickets` | setDoc merge | 1W |
| `getTicketById` | `supportTickets` | getDoc | 1R |
| `getStoresTickets` | `supportTickets` | getDocs (query) | NR |
| `getSupportTickets` | `supportTickets` | getDocs (query) | NR |
| `subscribeSupportTickets` | `supportTickets` | onSnapshot | Listener |
| `subscribeStoreTickets` | `supportTickets` | onSnapshot | Listener |

---

## 7. Document Growth Risk

**Concern:** Messages stored as array inside ticket document. Each message ~200-500 bytes. Firestore max doc size = 1 MB.

| Messages | Est. Doc Size | Status |
|:--------:|:------------:|:------:|
| 10 | ~5 KB | ✅ Safe |
| 50 | ~25 KB | ✅ Safe |
| 200 | ~100 KB | ✅ Safe |
| 500 | ~250 KB | ⚠️ Watch |
| 1000+ | ~500 KB+ | 🔴 Risk |

**Mitigation:** Typical support tickets have 5-20 messages. Risk is very low for normal usage. If tickets with 100+ messages become common, consider moving messages to a subcollection.
