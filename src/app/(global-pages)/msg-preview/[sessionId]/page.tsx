/**
 * Menu Preview Page — Public, No Auth Required
 *
 * Mobile-first responsive page for owners to review and approve their menu.
 * Token-based access (INV-2/ADR-13).
 *
 * @see __docs__/messaging-onboarding/messaging-onboarding_impl.md §7 Phase 3
 */

"use client";

import { useParams, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";

interface PreviewData {
  sessionId: string;
  state: string;
  businessName: string;
  businessType: string;
  businessCategory: string;
  phone: string;
  address: string;
  menuData: any;
  qualityScore: number | null;
  publishedResult: any | null;
  correctionCount: number;
  maxCorrections: number;
}

interface FixIssue {
  value: string;
  label: string;
}

const FIX_ISSUES: FixIssue[] = [
  { value: "price_incorrect", label: "Prices are wrong" },
  { value: "item_missing", label: "Items are missing" },
  { value: "spelling_error", label: "Spelling mistakes" },
  { value: "wrong_category", label: "Wrong categories" },
  { value: "other", label: "Other issue" },
];

export default function MsgPreviewPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const sessionId = params?.sessionId as string;
  const token = searchParams?.get("token") || "";

  const [preview, setPreview] = useState<PreviewData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Approve state
  const [approving, setApproving] = useState(false);
  const [approved, setApproved] = useState(false);
  const [publishResult, setPublishResult] = useState<any>(null);
  const [copySuccess, setCopySuccess] = useState(false);

  // Fix request state
  const [showFixForm, setShowFixForm] = useState(false);
  const [selectedIssues, setSelectedIssues] = useState<string[]>([]);
  const [fixNote, setFixNote] = useState("");
  const [submittingFix, setSubmittingFix] = useState(false);
  const [fixSubmitted, setFixSubmitted] = useState(false);

  // Editable business info
  const [businessName, setBusinessName] = useState("");
  const [editingName, setEditingName] = useState(false);
  const [businessType, setBusinessType] = useState("");
  const [editingType, setEditingType] = useState(false);
  const [address, setAddress] = useState("");
  const [editingAddress, setEditingAddress] = useState(false);

  useEffect(() => {
    if (!sessionId || !token) {
      setError("Invalid preview link");
      setLoading(false);
      return;
    }

    fetchPreview();
  }, [sessionId, token]);

  async function fetchPreview() {
    try {
      const res = await fetch(
        `/api/msg-preview/${sessionId}?token=${encodeURIComponent(token)}`,
      );

      if (!res.ok) {
        if (res.status === 410) setError("This preview has expired.");
        else if (res.status === 403) setError("Invalid preview link.");
        else if (res.status === 404) setError("Preview not found.");
        else setError("Preview unavailable.");
        setLoading(false);
        return;
      }

      const data: PreviewData = await res.json();
      setPreview(data);
      setBusinessName(data.businessName);
      setBusinessType(data.businessType || "Other");
      setAddress(data.address || "");

      if (data.state === "LIVE" && data.publishedResult) {
        setApproved(true);
        setPublishResult(data.publishedResult);
      }
    } catch {
      setError("Failed to load preview.");
    } finally {
      setLoading(false);
    }
  }

  async function handleApprove() {
    if (!preview || approving) return;
    setApproving(true);

    try {
      const res = await fetch(`/api/msg-preview/${sessionId}/approve`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token,
          businessName: businessName || preview.businessName,
          businessType: businessType || preview.businessType,
          phone: preview.phone,
          address: address || preview.address,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        setError(err.error || "Publishing failed. Try again.");
        setApproving(false);
        return;
      }

      const result = await res.json();
      setApproved(true);
      setPublishResult(result.publishedResult);
    } catch {
      setError("Publishing failed. Try again.");
    } finally {
      setApproving(false);
    }
  }

  async function handleFixSubmit() {
    if (selectedIssues.length === 0 || submittingFix) return;
    setSubmittingFix(true);

    try {
      const res = await fetch(`/api/msg-preview/${sessionId}/fix`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token,
          issues: selectedIssues,
          note: fixNote || undefined,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        if (err.maxReached) {
          setError("Maximum corrections reached. Send new menu photos on WhatsApp.");
        } else {
          setError(err.error || "Failed to submit fix request.");
        }
        setSubmittingFix(false);
        return;
      }

      setFixSubmitted(true);
      setShowFixForm(false);
    } catch {
      setError("Failed to submit fix request.");
    } finally {
      setSubmittingFix(false);
    }
  }

  function toggleIssue(value: string) {
    setSelectedIssues((prev) =>
      prev.includes(value)
        ? prev.filter((v) => v !== value)
        : [...prev, value],
    );
  }

  // ─── RENDER ───────────────────────────────────────────────

  if (loading) {
    return (
      <div style={styles.container}>
        <div style={styles.card}>
          <div style={styles.spinner} />
          <p style={styles.loadingText}>Loading your menu preview...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={styles.container}>
        <div style={styles.card}>
          <h2 style={styles.errorTitle}>Preview Unavailable</h2>
          <p style={styles.errorText}>{error}</p>
        </div>
      </div>
    );
  }

  if (approved && publishResult) {
    return (
      <div style={styles.container}>
        <div style={styles.card}>
          <div style={styles.successIcon}>✓</div>
          <h1 style={styles.successTitle}>Your menu is live.</h1>
          <p style={styles.successText}>
            Your official menu link is ready.
          </p>
          <p style={{ ...styles.successText, fontSize: 14, color: '#666', marginTop: 4 }}>
            Send this link when customers ask for your menu. It stays updated.
          </p>
          <a
            href={publishResult.publicUrl}
            target="_blank"
            rel="noopener noreferrer"
            style={styles.menuLink}
          >
            {publishResult.publicUrl}
          </a>
          <div style={{ display: 'flex', gap: 8, marginTop: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
            <button
              onClick={() => {
                navigator.clipboard.writeText(publishResult.publicUrl);
                setCopySuccess(true);
                setTimeout(() => setCopySuccess(false), 2000);
              }}
              style={{
                ...styles.approveBtn,
                padding: '10px 20px',
                fontSize: 14,
              }}
            >
              {copySuccess ? '✓ Copied' : 'Copy Link'}
            </button>
            <button
              onClick={() => {
                const msg = encodeURIComponent(
                  `Here is our latest menu:\n${publishResult.publicUrl}\n(Always updated)`
                );
                window.open(`https://wa.me/?text=${msg}`, '_blank');
              }}
              style={{
                ...styles.approveBtn,
                padding: '10px 20px',
                fontSize: 14,
                background: '#25D366',
                borderColor: '#25D366',
              }}
            >
              Share on WhatsApp
            </button>
          </div>
          <div style={{ marginTop: 20, textAlign: 'left', padding: '16px', background: '#f9fafb', borderRadius: 8 }}>
            <p style={{ fontSize: 13, fontWeight: 600, color: '#333', margin: '0 0 6px 0' }}>This link is ready for WhatsApp, Instagram, and staff.</p>
            <p style={{ margin: 0, fontSize: 13, color: '#555', lineHeight: 1.6 }}>Customers will see the current menu from the same link.</p>
          </div>
          <div style={styles.divider} />
          <p style={styles.dashboardText}>
            Manage your menu anytime:
          </p>
          <a
            href={publishResult.dashboardUrl}
            target="_blank"
            rel="noopener noreferrer"
            style={styles.dashboardLink}
          >
            Open Dashboard
          </a>
        </div>
      </div>
    );
  }

  if (fixSubmitted) {
    return (
      <div style={styles.container}>
        <div style={styles.card}>
          <h2 style={styles.fixTitle}>Correction request sent.</h2>
          <p style={styles.fixText}>
            Send clearer photos of the affected pages on WhatsApp.
            A new preview will be sent.
          </p>
        </div>
      </div>
    );
  }

  if (!preview) return null;

  const menuData = preview.menuData;
  const categories = menuData?.categories || [];
  const items = menuData?.items || [];

  return (
    <div style={styles.container}>
      {/* Header */}
      <div style={styles.header}>
        <div style={styles.previewBadge}>Preview — Not Live Yet</div>
        <h1 style={styles.headerTitle}>Menu Preview</h1>
        <p style={styles.headerSubtitle}>
          Confirm your menu before publishing
        </p>
      </div>

      {/* Business Info */}
      <div style={styles.card}>
        <h2 style={styles.sectionTitle}>Business Details</h2>
        <div style={styles.fieldGroup}>
          <label style={styles.label}>Business Name</label>
          {editingName ? (
            <div style={styles.editRow}>
              <input
                type="text"
                value={businessName}
                onChange={(e) => setBusinessName(e.target.value)}
                style={styles.input}
                autoFocus
              />
              <button
                onClick={() => setEditingName(false)}
                style={styles.saveBtn}
              >
                Save
              </button>
            </div>
          ) : (
            <div style={styles.editRow}>
              <span style={styles.fieldValue}>{businessName}</span>
              <button
                onClick={() => setEditingName(true)}
                style={styles.editBtn}
              >
                Edit
              </button>
            </div>
          )}
        </div>
        <div style={styles.fieldGroup}>
          <label style={styles.label}>Business Type</label>
          {editingType ? (
            <div style={styles.editRow}>
              <input
                type="text"
                value={businessType}
                onChange={(e) => setBusinessType(e.target.value)}
                style={styles.input}
                autoFocus
              />
              <button
                onClick={() => setEditingType(false)}
                style={styles.saveBtn}
              >
                Save
              </button>
            </div>
          ) : (
            <div style={styles.editRow}>
              <span style={styles.fieldValue}>{businessType}</span>
              <button
                onClick={() => setEditingType(true)}
                style={styles.editBtn}
              >
                Edit
              </button>
            </div>
          )}
        </div>
        {preview.phone && (
          <div style={styles.fieldGroup}>
            <label style={styles.label}>Phone</label>
            <span style={styles.fieldValue}>{preview.phone}</span>
          </div>
        )}
        <div style={styles.fieldGroup}>
          <label style={styles.label}>Address</label>
          {editingAddress ? (
            <div style={styles.editRow}>
              <input
                type="text"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                style={styles.input}
                autoFocus
              />
              <button
                onClick={() => setEditingAddress(false)}
                style={styles.saveBtn}
              >
                Save
              </button>
            </div>
          ) : (
            <div style={styles.editRow}>
              <span style={styles.fieldValue}>{address || "Not provided"}</span>
              <button
                onClick={() => setEditingAddress(true)}
                style={styles.editBtn}
              >
                Edit
              </button>
            </div>
          )}
        </div>
        <p style={styles.editHint}>You can edit anytime after publishing.</p>
      </div>

      {/* Menu Categories & Items */}
      <div style={styles.card}>
        <h2 style={styles.sectionTitle}>
          Menu ({categories.length} categories, {items.length} items)
        </h2>
        {categories.map((cat: any, catIdx: number) => {
          const catItems = items.filter(
            (item: any) => item.category === cat.id || item.category === cat.name?.en,
          );
          return (
            <div key={catIdx} style={styles.category}>
              <h3 style={styles.categoryName}>
                {cat.name?.en || cat.name || `Category ${catIdx + 1}`}
              </h3>
              {catItems.length === 0 && (
                <p style={styles.emptyCategory}>No items in this category</p>
              )}
              {catItems.map((item: any, itemIdx: number) => (
                <div key={itemIdx} style={styles.menuItem}>
                  <div style={styles.itemInfo}>
                    <span style={styles.itemName}>
                      {item.name?.en || item.name || `Item ${itemIdx + 1}`}
                    </span>
                    {item.description?.en && (
                      <span style={styles.itemDesc}>
                        {item.description.en}
                      </span>
                    )}
                  </div>
                  <span style={styles.itemPrice}>
                    {item.price || "—"}
                  </span>
                </div>
              ))}
            </div>
          );
        })}
      </div>

      {/* Fix Form */}
      {showFixForm && (
        <div style={styles.card}>
          <h2 style={styles.sectionTitle}>What needs fixing?</h2>
          <div style={styles.issueList}>
            {FIX_ISSUES.map((issue) => (
              <button
                key={issue.value}
                onClick={() => toggleIssue(issue.value)}
                style={{
                  ...styles.issueBtn,
                  ...(selectedIssues.includes(issue.value)
                    ? styles.issueBtnActive
                    : {}),
                }}
              >
                {selectedIssues.includes(issue.value) ? "✓ " : ""}
                {issue.label}
              </button>
            ))}
          </div>
          <textarea
            placeholder="Additional details (optional)"
            value={fixNote}
            onChange={(e) => setFixNote(e.target.value)}
            style={styles.textarea}
            maxLength={200}
          />
          <div style={styles.fixActions}>
            <button
              onClick={() => setShowFixForm(false)}
              style={styles.cancelBtn}
            >
              Cancel
            </button>
            <button
              onClick={handleFixSubmit}
              disabled={selectedIssues.length === 0 || submittingFix}
              style={{
                ...styles.submitFixBtn,
                ...(selectedIssues.length === 0
                  ? styles.btnDisabled
                  : {}),
              }}
            >
              {submittingFix ? "Sending..." : "Send Request"}
            </button>
          </div>
        </div>
      )}

      {/* Action Buttons */}
      {!showFixForm && (
        <div style={styles.actionBar}>
          <button
            onClick={() => setShowFixForm(true)}
            style={styles.fixBtn}
            disabled={
              preview.correctionCount >= preview.maxCorrections
            }
          >
            Request Fix
            {preview.correctionCount > 0 &&
              ` (${preview.correctionCount}/${preview.maxCorrections})`}
          </button>
          <button
            onClick={handleApprove}
            disabled={approving}
            style={styles.approveBtn}
          >
            {approving ? "Publishing..." : "Approve & Publish"}
          </button>
        </div>
      )}
    </div>
  );
}

// ─── STYLES (inline for zero-dependency mobile-first) ───────

const styles: Record<string, React.CSSProperties> = {
  container: {
    maxWidth: 480,
    margin: "0 auto",
    padding: "16px",
    fontFamily:
      '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    color: "#1a1a1a",
    minHeight: "100vh",
    background: "#f5f5f5",
  },
  header: {
    textAlign: "center",
    marginBottom: 16,
    padding: "16px 0",
  },
  previewBadge: {
    display: "inline-block",
    padding: "4px 12px",
    borderRadius: 20,
    background: "#fef3c7",
    color: "#92400e",
    fontSize: 12,
    fontWeight: 600,
    marginBottom: 8,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: 700,
    margin: 0,
    color: "#111",
  },
  headerSubtitle: {
    fontSize: 14,
    color: "#666",
    margin: "4px 0 0",
  },
  editHint: {
    fontSize: 12,
    color: "#999",
    margin: "8px 0 0",
    fontStyle: "italic",
  },
  card: {
    background: "#fff",
    borderRadius: 12,
    padding: 20,
    marginBottom: 12,
    boxShadow: "0 1px 3px rgba(0,0,0,0.08)",
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 600,
    marginTop: 0,
    marginBottom: 12,
    color: "#333",
  },
  fieldGroup: {
    marginBottom: 12,
  },
  label: {
    display: "block",
    fontSize: 12,
    fontWeight: 500,
    color: "#888",
    marginBottom: 4,
    textTransform: "uppercase" as const,
    letterSpacing: 0.5,
  },
  fieldValue: {
    fontSize: 15,
    color: "#333",
  },
  editRow: {
    display: "flex",
    alignItems: "center",
    gap: 8,
  },
  input: {
    flex: 1,
    padding: "8px 12px",
    borderRadius: 8,
    border: "1px solid #ddd",
    fontSize: 15,
    minHeight: 44,
    outline: "none",
  },
  editBtn: {
    minHeight: 44,
    padding: "8px 14px",
    borderRadius: 6,
    border: "1px solid #ddd",
    background: "#fff",
    fontSize: 13,
    cursor: "pointer",
    color: "#666",
  },
  saveBtn: {
    minHeight: 44,
    padding: "8px 16px",
    borderRadius: 6,
    border: "none",
    background: "#111",
    color: "#fff",
    fontSize: 13,
    cursor: "pointer",
  },
  category: {
    marginBottom: 16,
  },
  categoryName: {
    fontSize: 14,
    fontWeight: 600,
    color: "#555",
    margin: "0 0 8px",
    paddingBottom: 6,
    borderBottom: "1px solid #eee",
  },
  emptyCategory: {
    fontSize: 13,
    color: "#aaa",
    fontStyle: "italic",
  },
  menuItem: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    padding: "8px 0",
    borderBottom: "1px solid #f5f5f5",
  },
  itemInfo: {
    flex: 1,
    marginRight: 12,
  },
  itemName: {
    display: "block",
    fontSize: 14,
    fontWeight: 500,
    color: "#333",
  },
  itemDesc: {
    display: "block",
    fontSize: 12,
    color: "#888",
    marginTop: 2,
  },
  itemPrice: {
    fontSize: 14,
    fontWeight: 600,
    color: "#111",
    whiteSpace: "nowrap",
  },
  actionBar: {
    display: "flex",
    gap: 10,
    padding: "12px 0 24px",
    position: "sticky" as const,
    bottom: 0,
    background: "#f5f5f5",
  },
  fixBtn: {
    flex: 1,
    padding: "14px 16px",
    borderRadius: 10,
    border: "1px solid #ddd",
    background: "#fff",
    fontSize: 15,
    fontWeight: 500,
    cursor: "pointer",
    color: "#333",
  },
  approveBtn: {
    flex: 2,
    padding: "14px 16px",
    borderRadius: 10,
    border: "none",
    background: "#111",
    color: "#fff",
    fontSize: 15,
    fontWeight: 600,
    cursor: "pointer",
  },
  issueList: {
    display: "flex",
    flexWrap: "wrap" as const,
    gap: 8,
    marginBottom: 12,
  },
  issueBtn: {
    minHeight: 44,
    padding: "10px 14px",
    borderRadius: 20,
    border: "1px solid #ddd",
    background: "#fff",
    fontSize: 13,
    cursor: "pointer",
    color: "#555",
  },
  issueBtnActive: {
    background: "#111",
    color: "#fff",
    borderColor: "#111",
  },
  textarea: {
    width: "100%",
    padding: "10px 12px",
    borderRadius: 8,
    border: "1px solid #ddd",
    fontSize: 14,
    resize: "vertical" as const,
    minHeight: 60,
    marginBottom: 12,
    outline: "none",
    boxSizing: "border-box" as const,
  },
  fixActions: {
    display: "flex",
    gap: 8,
    justifyContent: "flex-end",
  },
  cancelBtn: {
    minHeight: 44,
    padding: "10px 20px",
    borderRadius: 8,
    border: "1px solid #ddd",
    background: "#fff",
    fontSize: 14,
    cursor: "pointer",
    color: "#666",
  },
  submitFixBtn: {
    minHeight: 44,
    padding: "10px 20px",
    borderRadius: 8,
    border: "none",
    background: "#111",
    color: "#fff",
    fontSize: 14,
    fontWeight: 500,
    cursor: "pointer",
  },
  btnDisabled: {
    opacity: 0.4,
    cursor: "not-allowed",
  },
  spinner: {
    width: 32,
    height: 32,
    border: "3px solid #eee",
    borderTopColor: "#111",
    borderRadius: "50%",
    animation: "spin 0.8s linear infinite",
    margin: "0 auto 12px",
  },
  loadingText: {
    textAlign: "center",
    color: "#888",
    fontSize: 14,
  },
  errorTitle: {
    fontSize: 18,
    fontWeight: 600,
    margin: "0 0 8px",
    textAlign: "center",
  },
  errorText: {
    fontSize: 14,
    color: "#666",
    textAlign: "center",
    margin: 0,
  },
  successIcon: {
    width: 56,
    height: 56,
    borderRadius: "50%",
    background: "#22c55e",
    color: "#fff",
    fontSize: 28,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    margin: "0 auto 16px",
    fontWeight: 700,
  },
  successTitle: {
    fontSize: 22,
    fontWeight: 700,
    textAlign: "center",
    margin: "0 0 8px",
  },
  successText: {
    fontSize: 14,
    color: "#666",
    textAlign: "center",
    margin: "0 0 12px",
  },
  menuLink: {
    display: "block",
    textAlign: "center",
    padding: "12px 16px",
    background: "#f0fdf4",
    borderRadius: 8,
    color: "#16a34a",
    fontWeight: 500,
    fontSize: 14,
    textDecoration: "none",
    wordBreak: "break-all",
  },
  divider: {
    height: 1,
    background: "#eee",
    margin: "16px 0",
  },
  dashboardText: {
    fontSize: 14,
    color: "#666",
    textAlign: "center",
    margin: "0 0 8px",
  },
  dashboardLink: {
    display: "block",
    textAlign: "center",
    padding: "12px 16px",
    background: "#111",
    borderRadius: 8,
    color: "#fff",
    fontWeight: 500,
    fontSize: 14,
    textDecoration: "none",
  },
  fixTitle: {
    fontSize: 18,
    fontWeight: 600,
    textAlign: "center",
    margin: "0 0 8px",
  },
  fixText: {
    fontSize: 14,
    color: "#666",
    textAlign: "center",
    margin: 0,
    lineHeight: 1.5,
  },
};
