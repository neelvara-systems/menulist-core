# 🌐 Network Status Monitoring

**Last Updated**: Nov 21, 2025  
**Status**: ✅ Production Ready

---

## 📋 **Overview**

Automatic network connectivity monitoring that blocks the UI when the user has no internet or a very slow connection. The blocker automatically disappears when the network is restored.

---

## ✨ **Features**

- ✅ **Detects offline status** - User lost internet connection
- ✅ **Detects slow network** - Connection < 1 Mbps or 2g/slow-2g
- ✅ **Non-closable blocker** - Modal cannot be dismissed manually
- ✅ **Auto-dismisses** - Disappears when network is restored
- ✅ **Network info** - Shows connection type, speed, latency (when available)
- ✅ **Smooth transitions** - 500ms delay to avoid flashing on quick reconnects
- ✅ **Visual feedback** - Pulsing indicator shows it's monitoring

---

## 🏗️ **Architecture**

### **Components**

```
NetworkStatusProvider
└── Uses useNetworkStatus hook
    ├── Monitors navigator.onLine
    ├── Monitors Network Information API (when available)
    └── Shows blocking modal when offline/slow
```

### **Files Created**

1. **`/src/hooks/useNetworkStatus.ts`** - Network monitoring hook
2. **`/src/providers/NetworkStatusProvider.tsx`** - UI blocker component
3. **`/src/components/antdComponent/layoutWrapper/index.tsx`** - Mounted in layout

---

## 💻 **Technical Details**

### **1. Network Detection Hook**

```typescript
// hooks/useNetworkStatus.ts
export const useNetworkStatus = (): NetworkStatus => {
  // Uses:
  // - navigator.onLine (basic online/offline)
  // - Network Information API (speed, type, latency)

  return {
    isOnline: boolean, // True if connected
    isSlow: boolean, // True if < 1 Mbps or 2g
    effectiveType: string, // '4g', '3g', '2g', 'slow-2g'
    downlink: number, // Download speed in Mbps
    rtt: number, // Round-trip time in ms
  };
};
```

### **2. Network Status Provider**

```typescript
// providers/NetworkStatusProvider.tsx
export default function NetworkStatusProvider({ children }) {
  const networkStatus = useNetworkStatus();

  // Show blocker if:
  // - User is offline (!networkStatus.isOnline)
  // - Network is slow (networkStatus.isSlow)

  return (
    <>
      <Modal
        open={shouldBlock}
        closable={false} // ✅ Non-closable
        maskClosable={false} // ✅ Click outside doesn't close
        keyboard={false} // ✅ Escape doesn't close
      >
        {/* Blocker UI */}
      </Modal>
      {children}
    </>
  );
}
```

### **3. Mounted in Layout**

```typescript
// components/antdComponent/layoutWrapper/index.tsx
return (
  <AntdThemeProvider>
    <GlobalKeyboardShortcutsProvider>
      <NetworkStatusProvider>
        {" "}
        {/* ✅ Monitors everywhere */}
        {renderContent()}
      </NetworkStatusProvider>
    </GlobalKeyboardShortcutsProvider>
  </AntdThemeProvider>
);
```

---

## 🎯 **When Blocker Appears**

### **Scenario 1: Offline**

```
User loses internet connection
↓
Modal appears after 500ms
↓
Shows: "No Internet Connection"
Icon: Red WiFi Off icon
Message: "Please check your internet connection"
```

### **Scenario 2: Slow Network**

```
Network drops below 1 Mbps or becomes 2g
↓
Modal appears after 500ms
↓
Shows: "Slow Network Detected"
Icon: Yellow Signal icon
Details: Connection type, speed, latency
Message: "Your network is too slow..."
```

### **Scenario 3: Connection Restored**

```
Network is back and fast enough
↓
Modal disappears immediately
↓
User can resume work
```

---

## 🎨 **UI Components**

### **Modal Structure**

```
┌─────────────────────────────────┐
│                                 │
│        [Icon in circle]         │ ← Red (offline) or Yellow (slow)
│                                 │
│     No Internet Connection      │ ← Title
│                                 │
│   Please check your internet    │ ← Description
│   connection and try again.     │
│                                 │
│   Connection type: 2G           │ ← Details (if available)
│   Download speed: 0.5 Mbps      │
│   Latency: 800 ms               │
│                                 │
│   ● Waiting for connection...   │ ← Pulsing indicator
│                                 │
└─────────────────────────────────┘
```

---

## 🔧 **Configuration**

### **Slow Network Threshold**

Currently defined in `useNetworkStatus.ts`:

```typescript
const isSlow =
  effectiveType === "2g" || // 2G connection
  effectiveType === "slow-2g" || // Very slow 2G
  downlink < 1 || // Less than 1 Mbps
  rtt > 500; // Latency > 500ms
```

**To adjust**:

- Change `downlink < 1` to different Mbps threshold
- Change `rtt > 500` to different latency threshold

### **Delay Before Showing**

Currently 500ms delay to avoid flashing:

```typescript
// In NetworkStatusProvider.tsx
const timer = setTimeout(() => {
  setShowBlocker(true);
}, 500); // ← Change this value
```

---

## 🌐 **Browser Support**

### **Basic Online/Offline Detection**

✅ **Supported in all browsers**

- Uses `navigator.onLine`
- Works on Chrome, Firefox, Safari, Edge

### **Network Information API**

⚠️ **Limited support**

- ✅ Chrome/Edge (Chromium-based)
- ❌ Firefox (not supported)
- ❌ Safari (not supported)

**Fallback**: If Network Information API is not available, only basic online/offline detection works (no speed/latency info).

---

## 🧪 **Testing**

### **Manual Testing**

#### **Test 1: Offline**

```bash
1. Open app
2. Turn off WiFi/Ethernet
3. Wait 500ms
4. ✅ Should see "No Internet Connection" modal
5. Turn WiFi back on
6. ✅ Modal should disappear immediately
```

#### **Test 2: Slow Network (Chrome DevTools)**

```bash
1. Open app
2. Open Chrome DevTools (F12)
3. Go to Network tab
4. Throttling: Select "Slow 3G" or "Slow 2G"
5. Wait 500ms
6. ✅ Should see "Slow Network Detected" modal
7. Throttling: Select "No throttling"
8. ✅ Modal should disappear
```

#### **Test 3: Quick Disconnect**

```bash
1. Open app
2. Turn off WiFi for < 500ms, then back on
3. ✅ Modal should NOT appear (delay prevents flashing)
```

### **Network Info Display (Chrome Only)**

```bash
1. Use Chrome browser
2. Throttle to "Slow 3G"
3. ✅ Should show:
   - Connection type: 3G
   - Download speed: ~0.4 Mbps
   - Latency: ~400ms
```

---

## 🎓 **Best Practices**

### **✅ Do**

- Keep the 500ms delay to avoid flashing
- Show friendly, non-technical error messages
- Auto-dismiss when network is restored
- Provide visual feedback (pulsing indicator)

### **❌ Don't**

- Make the modal closable (defeats the purpose)
- Show too much technical info (confusing for users)
- Block the UI for very short disconnections (< 500ms)
- Forget to test on different browsers

---

## 🔮 **Future Enhancements**

### **Potential Additions**

1. **Retry button** - Allow manual retry after X seconds
2. **Offline mode** - Cache data for offline work
3. **Network quality indicator** - Show icon in header (green/yellow/red)
4. **Bandwidth estimation** - Test actual download speed
5. **Configurable thresholds** - Admin can adjust slow network definition

### **Example: Add Retry Button**

```typescript
<Button
  type="primary"
  onClick={async () => {
    // Force network check
    await fetch("/api/ping");
  }}
>
  Retry Connection
</Button>
```

---

## 📊 **Impact**

### **Before**

❌ Users experience confusing errors when offline  
❌ API calls fail silently with no explanation  
❌ User doesn't know if app is broken or network is down

### **After**

✅ Clear indication when network is unavailable  
✅ Prevents user frustration and confusion  
✅ Automatic recovery when network is restored  
✅ Shows connection quality information

---

## 🎯 **Summary**

**What It Does**:

- Monitors network status in real-time
- Blocks UI with non-closable modal when offline/slow
- Auto-dismisses when network is restored

**Why It Matters**:

- Improves user experience during network issues
- Prevents confusing errors and failed actions
- Provides clear feedback about connectivity problems

**How It Works**:

1. Hook monitors `navigator.onLine` and Network Information API
2. Provider shows blocking modal when network is bad
3. Modal disappears automatically when network is restored

---

## 📁 **Related Files**

- **Hook**: `/src/hooks/useNetworkStatus.ts`
- **Provider**: `/src/providers/NetworkStatusProvider.tsx`
- **Mounted in**: `/src/components/antdComponent/layoutWrapper/index.tsx`

---

**Network monitoring is now active! The app will automatically handle poor connectivity.** 🌐✨
