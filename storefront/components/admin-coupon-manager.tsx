"use client";

import { useEffect, useState } from "react";
import { Plus, RefreshCw, Tag, Trash2 } from "lucide-react";

type Coupon = {
  id: string;
  code: string;
  percentage: number;
  active: boolean;
  createdAt: string;
};

export function AdminCouponManager() {
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [code, setCode] = useState("");
  const [percentage, setPercentage] = useState(10);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  async function loadCoupons() {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/coupons", { cache: "no-store" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Could not load coupons.");
      setCoupons(data.coupons || []);
    } catch (error) {
      setMessage({ type: "error", text: error instanceof Error ? error.message : "Could not load coupons." });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadCoupons();
  }, []);

  async function createCoupon() {
    const normalized = code.trim().toUpperCase().replace(/\s+/g, "");
    if (!normalized) {
      setMessage({ type: "error", text: "Enter a coupon code." });
      return;
    }
    if (!Number.isFinite(percentage) || percentage < 1 || percentage > 100) {
      setMessage({ type: "error", text: "Discount must be between 1% and 100%." });
      return;
    }

    setSaving(true);
    setMessage(null);
    try {
      const res = await fetch("/api/admin/coupons", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ code: normalized, percentage }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Could not create coupon.");
      setCoupons(data.coupons || []);
      setCode("");
      setMessage({ type: "success", text: `Coupon ${normalized} created with ${percentage}% discount. It is live at checkout.` });
    } catch (error) {
      setMessage({ type: "error", text: error instanceof Error ? error.message : "Could not create coupon." });
    } finally {
      setSaving(false);
    }
  }

  async function setActive(coupon: Coupon, active: boolean) {
    setSaving(true);
    setMessage(null);
    try {
      const res = await fetch("/api/admin/coupons", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ id: coupon.id, active }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Could not update coupon.");
      setCoupons(data.coupons || []);
      setMessage({ type: "success", text: `${coupon.code} is now ${active ? "active" : "inactive"}.` });
    } catch (error) {
      setMessage({ type: "error", text: error instanceof Error ? error.message : "Could not update coupon." });
    } finally {
      setSaving(false);
    }
  }

  async function removeCoupon(coupon: Coupon) {
    if (!confirm(`Delete coupon ${coupon.code}? It will stop working immediately.`)) return;
    setSaving(true);
    setMessage(null);
    try {
      const res = await fetch("/api/admin/coupons", {
        method: "DELETE",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ id: coupon.id }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Could not delete coupon.");
      setCoupons(data.coupons || []);
      setMessage({ type: "success", text: `${coupon.code} deleted.` });
    } catch (error) {
      setMessage({ type: "error", text: error instanceof Error ? error.message : "Could not delete coupon." });
    } finally {
      setSaving(false);
    }
  }

  const inputStyle = {
    width: "100%",
    padding: "0.55rem 0.75rem",
    borderRadius: "6px",
    border: "1px solid #dcd4c4",
    fontSize: "0.88rem",
    background: "#fff",
    boxSizing: "border-box" as const,
  };

  return (
    <div style={{ border: "1px solid #d8b456", background: "#fffdf7", borderRadius: "10px", padding: "1rem", marginTop: "1.25rem" }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: "1rem", alignItems: "center", flexWrap: "wrap" }}>
        <div>
          <h4 style={{ margin: 0, color: "#102218", fontSize: "1rem", display: "flex", alignItems: "center", gap: "0.4rem" }}>
            <Tag size={17} /> Checkout Discount Coupons
          </h4>
          <p style={{ margin: "0.25rem 0 0", color: "#665e52", fontSize: "0.8rem" }}>
            Create percentage coupons here. Active codes are validated securely at checkout before payment is created.
          </p>
        </div>
        <button
          type="button"
          onClick={loadCoupons}
          disabled={loading || saving}
          style={{ border: "1px solid #dcd4c4", background: "#fff", borderRadius: "6px", padding: "0.4rem 0.65rem", cursor: "pointer", display: "inline-flex", gap: "0.3rem", alignItems: "center" }}
        >
          <RefreshCw size={14} /> Refresh
        </button>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "minmax(180px, 1fr) 140px auto", gap: "0.65rem", marginTop: "1rem", alignItems: "end" }}>
        <label style={{ fontSize: "0.78rem", fontWeight: 700, color: "#4a4235" }}>
          COUPON CODE
          <input
            style={{ ...inputStyle, marginTop: "0.3rem", textTransform: "uppercase" }}
            value={code}
            maxLength={40}
            placeholder="e.g. WELCOME15"
            onChange={(e) => setCode(e.target.value.toUpperCase().replace(/\s+/g, ""))}
          />
        </label>
        <label style={{ fontSize: "0.78rem", fontWeight: 700, color: "#4a4235" }}>
          DISCOUNT %
          <input
            style={{ ...inputStyle, marginTop: "0.3rem" }}
            type="number"
            min={1}
            max={100}
            value={percentage}
            onChange={(e) => setPercentage(Math.max(1, Math.min(100, Number(e.target.value) || 1)))}
          />
        </label>
        <button
          type="button"
          onClick={createCoupon}
          disabled={saving}
          style={{ padding: "0.58rem 0.9rem", border: "none", borderRadius: "6px", background: "#102218", color: "#fff", fontWeight: 700, cursor: saving ? "wait" : "pointer", display: "inline-flex", gap: "0.35rem", alignItems: "center" }}
        >
          <Plus size={15} /> Create Coupon
        </button>
      </div>

      {message && (
        <p style={{ margin: "0.75rem 0 0", fontSize: "0.82rem", color: message.type === "success" ? "#166534" : "#991b1b" }}>
          {message.text}
        </p>
      )}

      <div style={{ display: "grid", gap: "0.55rem", marginTop: "1rem" }}>
        {loading ? (
          <p style={{ fontSize: "0.82rem", color: "#665e52" }}>Loading coupons…</p>
        ) : coupons.length === 0 ? (
          <p style={{ fontSize: "0.82rem", color: "#665e52" }}>No discount coupons created yet.</p>
        ) : coupons.map((coupon) => (
          <div key={coupon.id} style={{ display: "grid", gridTemplateColumns: "1fr auto auto", gap: "0.65rem", alignItems: "center", padding: "0.65rem 0.75rem", background: "#fff", border: "1px solid #e6decb", borderRadius: "8px" }}>
            <div>
              <strong style={{ color: "#102218", letterSpacing: "0.04em" }}>{coupon.code}</strong>
              <span style={{ marginLeft: "0.6rem", color: "#8a6616", fontWeight: 700 }}>{coupon.percentage}% off</span>
              <div style={{ fontSize: "0.72rem", color: "#777", marginTop: "0.15rem" }}>
                Created {new Date(coupon.createdAt).toLocaleString()}
              </div>
            </div>
            <label style={{ display: "inline-flex", alignItems: "center", gap: "0.35rem", fontSize: "0.78rem", fontWeight: 600, cursor: "pointer" }}>
              <input
                type="checkbox"
                checked={coupon.active}
                disabled={saving}
                onChange={(e) => setActive(coupon, e.target.checked)}
              />
              {coupon.active ? "Active" : "Inactive"}
            </label>
            <button
              type="button"
              disabled={saving}
              onClick={() => removeCoupon(coupon)}
              aria-label={`Delete coupon ${coupon.code}`}
              style={{ border: "1px solid #fecaca", background: "#fef2f2", color: "#991b1b", borderRadius: "5px", padding: "0.38rem", cursor: "pointer" }}
            >
              <Trash2 size={14} />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
