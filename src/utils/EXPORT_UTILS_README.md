# Export Utilities Documentation

A reusable, type-safe CSV/Excel export system for exporting data from the application.

## 📁 Files

- **`exportUtils.ts`** - Generic CSV/Excel export functions
- **`supportTickets/exportConfig.ts`** - Support ticket export column configurations

---

## 🚀 Quick Start

### Basic Usage

```typescript
import { exportToCSV } from '@util/exportUtils';
import { ticketCSVColumns } from './exportConfig';

// Export data
const handleExport = () => {
  exportToCSV(tickets, ticketCSVColumns, {
    filename: 'my-export-2025-10-03'
  });
};
```

---

## 📚 API Reference

### `exportToCSV<T>(data, columns, options)`

Generic CSV export function.

**Parameters:**
- `data: T[]` - Array of data objects to export
- `columns: CSVColumn<T>[]` - Column configuration
- `options?: ExportOptions` - Optional export settings

**Options:**
```typescript
{
  filename?: string;          // Default: 'export-YYYY-MM-DD'
  showSuccessMessage?: boolean; // Default: true
}
```

**Returns:** `void`

---

### `exportToExcel<T>(data, columns, options)`

Excel-optimized export with BOM for UTF-8 recognition.

Same parameters as `exportToCSV`, but adds UTF-8 BOM for better Excel compatibility.

---

### `CSVColumn<T>` Interface

Defines a column in the CSV export.

```typescript
interface CSVColumn<T> {
  header: string;                    // Column header text
  accessor: (item: T) => any;        // Function to extract value from item
}
```

---

## 🎯 Usage Examples

### Example 1: Export with Custom Columns

```typescript
import { exportToCSV, CSVColumn } from '@util/exportUtils';

interface User {
  id: string;
  name: string;
  email: string;
  createdAt: Timestamp;
}

const userColumns: CSVColumn<User>[] = [
  {
    header: 'User ID',
    accessor: (user) => user.id,
  },
  {
    header: 'Full Name',
    accessor: (user) => user.name,
  },
  {
    header: 'Email Address',
    accessor: (user) => user.email,
  },
  {
    header: 'Joined Date',
    accessor: (user) => formatTimestampForCSV(user.createdAt),
  },
];

const handleExport = () => {
  exportToCSV(users, userColumns, {
    filename: `users-export-${new Date().toISOString().split('T')[0]}`,
  });
};
```

---

### Example 2: Conditional Values

```typescript
const orderColumns: CSVColumn<Order>[] = [
  {
    header: 'Order ID',
    accessor: (order) => order.id,
  },
  {
    header: 'Status',
    accessor: (order) => order.status,
  },
  {
    header: 'Total Amount',
    accessor: (order) => order.total.toFixed(2),
  },
  {
    header: 'Discount Applied',
    accessor: (order) => order.discount ? 'Yes' : 'No',
  },
  {
    header: 'Shipping Address',
    accessor: (order) => {
      const addr = order.shippingAddress;
      return addr ? `${addr.street}, ${addr.city}, ${addr.zip}` : 'N/A';
    },
  },
];
```

---

### Example 3: Calculated Values

```typescript
const salesColumns: CSVColumn<Sale>[] = [
  {
    header: 'Sale ID',
    accessor: (sale) => sale.id,
  },
  {
    header: 'Gross Amount',
    accessor: (sale) => sale.amount,
  },
  {
    header: 'Tax (18%)',
    accessor: (sale) => (sale.amount * 0.18).toFixed(2),
  },
  {
    header: 'Net Amount',
    accessor: (sale) => (sale.amount * 1.18).toFixed(2),
  },
  {
    header: 'Days Since Sale',
    accessor: (sale) => {
      const days = Math.floor(
        (Date.now() - sale.createdAt.toMillis()) / (1000 * 60 * 60 * 24)
      );
      return days;
    },
  },
];
```

---

## 🎨 Support Ticket Export Configurations

Three pre-configured column sets are available for ticket exports:

### 1. `ticketCSVColumns` - Full Export
Complete ticket details including SLA status, tags, message count, etc.

**14 columns:**
- Ticket ID, Client Store, Client Tenant
- Status, Priority, Category
- Subject, Message
- SLA Status, SLA Time Remaining
- Tags, Messages Count
- Created On, Last Updated

```typescript
import { ticketCSVColumns } from './exportConfig';
exportToCSV(tickets, ticketCSVColumns);
```

---

### 2. `ticketCSVColumnsMinimal` - Quick Export
Essential ticket information for quick reports.

**7 columns:**
- Ticket ID, Client (combined)
- Status, Priority, Subject
- SLA Status, Created On

```typescript
import { ticketCSVColumnsMinimal } from './exportConfig';
exportToCSV(tickets, ticketCSVColumnsMinimal);
```

---

### 3. `ticketAnalyticsColumns` - Analytics Export
Performance metrics for each ticket.

**8 columns:**
- Ticket ID, Priority, Category, Created On
- First Response Time (hours)
- Resolution Time (hours)
- SLA Status, SLA Breached (Yes/No)

```typescript
import { ticketAnalyticsColumns } from './exportConfig';
exportToCSV(tickets, ticketAnalyticsColumns);
```

---

## 🛠️ Helper Functions

### `formatTimestampForCSV(timestamp, format)`

Converts Firestore Timestamps to CSV-friendly format.

**Parameters:**
- `timestamp: Timestamp | Date` - Firestore timestamp or Date object
- `format: 'iso' | 'locale'` - Output format (default: 'iso')

**Returns:** `string`

**Examples:**
```typescript
// ISO format (recommended for CSV)
formatTimestampForCSV(ticket.createdOn, 'iso')
// → "2025-10-03T10:30:00.000Z"

// Locale format
formatTimestampForCSV(ticket.createdOn, 'locale')
// → "10/3/2025, 10:30:00 AM"
```

---

## 🔒 CSV Value Escaping

The utility automatically handles:
- ✅ Commas in values (wraps in quotes)
- ✅ Quotes in values (escapes with double quotes)
- ✅ Newlines in values (wraps in quotes)
- ✅ Null/undefined values (converts to "N/A")

**Examples:**
```typescript
// Input: { subject: 'Order issue, need help' }
// CSV: "Order issue, need help"

// Input: { subject: 'Client said "urgent"' }
// CSV: "Client said ""urgent"""

// Input: { storeName: null }
// CSV: N/A
```

---

## 🌟 Best Practices

### 1. **Use Type-Safe Columns**
```typescript
// ✅ Good - Type-safe
const columns: CSVColumn<MyType>[] = [
  { header: 'ID', accessor: (item) => item.id }
];

// ❌ Bad - No type safety
const columns = [
  { header: 'ID', accessor: (item) => item.id }
];
```

### 2. **Handle Null Values**
```typescript
{
  header: 'Store Name',
  accessor: (ticket) => ticket.clientDetails?.storeName || 'N/A',
}
```

### 3. **Format Dates Consistently**
```typescript
{
  header: 'Created On',
  accessor: (ticket) => formatTimestampForCSV(ticket.createdOn, 'iso'),
}
```

### 4. **Use Meaningful Filenames**
```typescript
exportToCSV(data, columns, {
  filename: `tickets-${status}-${new Date().toISOString().split('T')[0]}`
});
// → "tickets-resolved-2025-10-03.csv"
```

### 5. **Group Related Columns**
```typescript
const columns = [
  // IDs
  { header: 'Ticket ID', accessor: ... },
  
  // Client Info
  { header: 'Store', accessor: ... },
  { header: 'Tenant', accessor: ... },
  
  // Status Info
  { header: 'Status', accessor: ... },
  { header: 'Priority', accessor: ... },
];
```

---

## 🧪 Testing Exports

1. **Empty Data Check:**
```typescript
exportToCSV([], columns); // Shows warning message
```

2. **Special Characters:**
```typescript
const testData = [
  { subject: 'Test, with comma' },
  { subject: 'Test "with quotes"' },
  { subject: 'Test\nwith newline' }
];
// All handled correctly
```

3. **Large Exports:**
```typescript
// Works with thousands of records
exportToCSV(largeDataset, columns);
```

---

## 📊 Use Cases

### Customer Support Tickets
```typescript
exportToCSV(filteredTickets, ticketCSVColumns, {
  filename: `support-tickets-${filterType}-${date}`
});
```

### Analytics Reports
```typescript
exportToCSV(tickets, ticketAnalyticsColumns, {
  filename: `analytics-report-${month}`
});
```

### Monthly Reports
```typescript
const monthlyTickets = tickets.filter(/* filter by month */);
exportToCSV(monthlyTickets, ticketCSVColumnsMinimal, {
  filename: `monthly-report-${year}-${month}`
});
```

### SLA Compliance Reports
```typescript
const breachedTickets = tickets.filter(t => /* SLA breached */);
exportToCSV(breachedTickets, ticketAnalyticsColumns, {
  filename: `sla-breached-${date}`
});
```

---

## 🔧 Extending for New Data Types

To create exports for new data types:

1. **Define your column configuration:**
```typescript
// src/components/your-feature/exportConfig.ts
import { CSVColumn } from '@util/exportUtils';

export const myDataColumns: CSVColumn<MyDataType>[] = [
  {
    header: 'Column 1',
    accessor: (item) => item.field1,
  },
  {
    header: 'Column 2',
    accessor: (item) => item.field2,
  },
];
```

2. **Use in your component:**
```typescript
import { exportToCSV } from '@util/exportUtils';
import { myDataColumns } from './exportConfig';

const handleExport = () => {
  exportToCSV(myData, myDataColumns, {
    filename: 'my-export'
  });
};
```

---

## 📝 Notes

- **Excel Compatibility:** Use `exportToExcel()` for better UTF-8 support in Excel
- **File Size:** No practical limit - browser handles download
- **Browser Support:** Works in all modern browsers
- **Character Encoding:** UTF-8 with BOM option for Excel
- **Date Format:** ISO 8601 recommended for sorting in Excel

---

## 🐛 Troubleshooting

### Issue: Excel shows garbled characters
**Solution:** Use `exportToExcel()` instead of `exportToCSV()`

### Issue: Commas break columns
**Solution:** Values are auto-escaped - check your accessor functions

### Issue: Empty file downloads
**Solution:** Ensure data array is not empty and columns are configured correctly

### Issue: Dates show as numbers in Excel
**Solution:** Use `formatTimestampForCSV()` helper function

---

## 🎯 Summary

The export utility provides:
- ✅ **Type-safe** column definitions
- ✅ **Reusable** across different data types
- ✅ **Automatic** CSV escaping
- ✅ **Flexible** column configuration
- ✅ **User-friendly** with success messages
- ✅ **Excel-compatible** with BOM support
- ✅ **Pre-configured** ticket export templates
