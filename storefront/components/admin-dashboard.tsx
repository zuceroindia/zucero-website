"use client";

import { useCallback, useEffect, useState, useTransition } from "react";
import Link from "next/link";
import {
  LayoutDashboard,
  Package,
  Users,
  Download,
  MessageCircle,
  FileText,
  Truck,
  Search,
  RefreshCw,
  CheckCircle2,
  X,
  Phone,
  Mail,
  Globe,
} from "lucide-react";
import styles from "@/app/admin/admin.module.css";

type Tab = "overview" | "orders" | "customers" | "export";

type Metrics = {
  totalRevenueRupees: string;
  totalOrdersCount: number;
  paidOrdersCount: number;
  shippedOrdersCount: number;
  customersCount: number;
  totalWalletBalanceRupees: string;
  totalEarnedReferralRupees: string;
  inquiriesCount: number;
  waConversationsCount: number;
};

type RecentOrder = {
  id: string;
  orderNumber: string;
  createdAt: string;
  status: string;
  paymentStatus: string;
  totalRupees: string;
  customerEmail: string;
  customerPhone: string;
  trackingAwb: string | null;
  courierName: string | null;
  itemsSummary: string;
};

type OrderItem = {
  product_name: string;
  variant_label: string;
  quantity: number;
  unit_price_paise: number;
  line_total_paise: number;
};

type Order = {
  id: string;
  orderNumber: string;
  createdAt: string;
  status: string;
  paymentStatus: string;
  totalPaise: number;
  totalRupees: string;
  subtotalRupees: string;
  taxRupees: string;
  shippingRupees: string;
  discountRupees: string;
  walletSpentRupees: string;
  customerEmail: string;
  customerPhone: string;
  shippingAddress: {
    fullName?: string;
    phone?: string;
    addressLine1?: string;
    addressLine2?: string;
    city?: string;
    state?: string;
    postalCode?: string;
  } | null;
  trackingAwb: string | null;
  courierName: string | null;
  trackingUrl: string | null;
  estimatedDeliveryWindow: string | null;
  razorpayPaymentId: string | null;
  items: OrderItem[];
};

type Customer = {
  email: string;
  fullName: string;
  phone: string;
  ordersCount: number;
  totalSpentRupees: string;
  walletBalanceRupees: string;
  referralCode: string;
  firstOrderDate: string;
  lastOrderDate: string;
};

export function AdminDashboard() {
  const [activeTab, setActiveTab] = useState<Tab>("overview");
  const [isPending, startTransition] = useTransition();

  // Metrics
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [recentOrders, setRecentOrders] = useState<RecentOrder[]>([]);

  // Orders
  const [orders, setOrders] = useState<Order[]>([]);
  const [orderSearch, setOrderSearch] = useState("");
  const [orderStatus, setOrderStatus] = useState("all");

  // Customers
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [customerSearch, setCustomerSearch] = useState("");

  // Tracking Modal State
  const [shippingOrder, setShippingOrder] = useState<Order | null>(null);
  const [awbInput, setAwbInput] = useState("");
  const [courierInput, setCourierInput] = useState("Shiprocket Express");
  const [isUpdatingTracking, setIsUpdatingTracking] = useState(false);

  // Alert State
  const [bannerMessage, setBannerMessage] = useState<string | null>(null);
  const [bannerError, setBannerError] = useState<string | null>(null);

  // Fetch overview
  const fetchOverview = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/overview", { cache: "no-store" });
      if (!res.ok) throw new Error("Failed to load overview");
      const data = await res.json();
      setMetrics(data.metrics);
      setRecentOrders(data.recentOrders || []);
    } catch (err) {
      console.error(err);
    }
  }, []);

  // Fetch orders
  const fetchOrders = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (orderSearch) params.set("search", orderSearch);
      if (orderStatus !== "all") params.set("status", orderStatus);
      const res = await fetch(`/api/admin/orders?${params.toString()}`, { cache: "no-store" });
      if (!res.ok) throw new Error("Failed to load orders");
      const data = await res.json();
      setOrders(data.orders || []);
    } catch (err) {
      console.error(err);
    }
  }, [orderSearch, orderStatus]);

  // Fetch customers
  const fetchCustomers = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (customerSearch) params.set("search", customerSearch);
      const res = await fetch(`/api/admin/customers?${params.toString()}`, { cache: "no-store" });
      if (!res.ok) throw new Error("Failed to load customers");
      const data = await res.json();
      setCustomers(data.customers || []);
    } catch (err) {
      console.error(err);
    }
  }, [customerSearch]);

  // Refresh current view
  function refreshCurrent() {
    startTransition(async () => {
      setBannerMessage(null);
      setBannerError(null);
      await fetchOverview();
      if (activeTab === "orders") await fetchOrders();
      if (activeTab === "customers") await fetchCustomers();
    });
  }

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void fetchOverview();
    }, 0);
    return () => window.clearTimeout(timer);
  }, [fetchOverview]);

  useEffect(() => {
    if (activeTab === "orders") {
      const timer = window.setTimeout(() => {
        void fetchOrders();
      }, 0);
      return () => window.clearTimeout(timer);
    }
    if (activeTab === "customers") {
      const timer = window.setTimeout(() => {
        void fetchCustomers();
      }, 0);
      return () => window.clearTimeout(timer);
    }
  }, [activeTab, fetchOrders, fetchCustomers]);

  // Handle update tracking/shipment
  async function handleSaveTracking(e: React.FormEvent) {
    e.preventDefault();
    if (!shippingOrder || !awbInput.trim()) return;

    setIsUpdatingTracking(true);
    setBannerError(null);
    setBannerMessage(null);

    try {
      const res = await fetch(`/api/orders/${shippingOrder.id}/ship`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          awb: awbInput.trim(),
          courierName: courierInput.trim() || "Shiprocket Express",
          status: "shipped",
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to update tracking");

      setBannerMessage(`✅ Tracking saved for Order ${shippingOrder.orderNumber} (AWB: ${awbInput.trim()})`);
      setShippingOrder(null);
      setAwbInput("");

      // Refresh orders and overview
      await fetchOrders();
      await fetchOverview();
    } catch (err: unknown) {
      setBannerError(err instanceof Error ? err.message : "Failed to update tracking");
    } finally {
      setIsUpdatingTracking(false);
    }
  }

  function getStatusBadge(status: string, paymentStatus?: string) {
    const s = (status || "").toLowerCase();
    const p = (paymentStatus || "").toLowerCase();

    if (s === "shipped" || s === "in_transit") {
      return <span className={`${styles.badge} ${styles.badgeShipped}`}>Shipped</span>;
    }
    if (s === "paid" || p === "captured") {
      return <span className={`${styles.badge} ${styles.badgePaid}`}>Paid</span>;
    }
    if (s === "cancelled" || p === "failed") {
      return <span className={`${styles.badge} ${styles.badgeCancelled}`}>Cancelled</span>;
    }
    return <span className={`${styles.badge} ${styles.badgePending}`}>{status || "Pending"}</span>;
  }

  function cleanPhone(phone: string) {
    return (phone || "").replace(/\D/g, "").slice(-10);
  }

  return (
    <div className={styles.shell}>
      {/* Top Header Bar */}
      <header className={styles.topbar}>
        <div>
          <p>Merchant Portal · Zucero</p>
          <h1>Master Admin</h1>
        </div>
        <div className={styles.topbarActions}>
          <button
            type="button"
            className={styles.refreshBtn}
            onClick={refreshCurrent}
            disabled={isPending}
            title="Refresh dashboard data"
          >
            <RefreshCw size={15} className={isPending ? "spin" : ""} />
            {isPending ? "Refreshing..." : "Refresh"}
          </button>
          <Link href="/admin/whatsapp" className={styles.whatsappLinkBtn}>
            <MessageCircle size={15} />
            Live WhatsApp CRM
          </Link>
        </div>
      </header>

      {/* Global Banners */}
      {bannerMessage && (
        <div
          style={{
            background: "#e6f4ea",
            border: "1px solid #137333",
            color: "#137333",
            padding: "0.85rem 1.25rem",
            borderRadius: "6px",
            marginBottom: "1.5rem",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <span>{bannerMessage}</span>
          <button
            type="button"
            onClick={() => setBannerMessage(null)}
            style={{ background: "transparent", border: 0, cursor: "pointer", color: "#137333" }}
          >
            <X size={16} />
          </button>
        </div>
      )}

      {bannerError && (
        <div
          style={{
            background: "#fce8e6",
            border: "1px solid #c5221f",
            color: "#c5221f",
            padding: "0.85rem 1.25rem",
            borderRadius: "6px",
            marginBottom: "1.5rem",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <span>{bannerError}</span>
          <button
            type="button"
            onClick={() => setBannerError(null)}
            style={{ background: "transparent", border: 0, cursor: "pointer", color: "#c5221f" }}
          >
            <X size={16} />
          </button>
        </div>
      )}

      {/* Navigation Tabs */}
      <nav className={styles.navTabs} aria-label="Admin Navigation Tabs">
        <button
          type="button"
          className={`${styles.tabBtn} ${activeTab === "overview" ? styles.activeTab : ""}`}
          onClick={() => setActiveTab("overview")}
        >
          <LayoutDashboard size={16} />
          Overview &amp; Metrics
        </button>
        <button
          type="button"
          className={`${styles.tabBtn} ${activeTab === "orders" ? styles.activeTab : ""}`}
          onClick={() => setActiveTab("orders")}
        >
          <Package size={16} />
          Orders ({metrics?.totalOrdersCount ?? orders.length})
        </button>
        <button
          type="button"
          className={`${styles.tabBtn} ${activeTab === "customers" ? styles.activeTab : ""}`}
          onClick={() => setActiveTab("customers")}
        >
          <Users size={16} />
          Customers &amp; Wallets ({metrics?.customersCount ?? customers.length})
        </button>
        <button
          type="button"
          className={`${styles.tabBtn} ${activeTab === "export" ? styles.activeTab : ""}`}
          onClick={() => setActiveTab("export")}
        >
          <Download size={16} />
          Supabase Data Export
        </button>
        <button
          type="button"
          className={styles.tabBtn}
          aria-disabled="true"
          title="Update Live Website"
          onClick={() => undefined}
          style={{ cursor: "default" }}
        >
          <Globe size={16} />
          Update Live Website
        </button>
      </nav>

      {/* ─── TAB 1: OVERVIEW ─── */}
      {activeTab === "overview" && (
        <>
          <section className={styles.kpiGrid} aria-label="Key Performance Indicators">
            <div className={styles.kpiCard}>
              <span className={styles.kpiLabel}>Total Paid Revenue</span>
              <span className={styles.kpiValue}>
                ₹{metrics?.totalRevenueRupees ?? "0.00"}
              </span>
              <span className={styles.kpiFoot}>Captured via Razorpay &amp; Wallet</span>
            </div>
            <div className={styles.kpiCard}>
              <span className={styles.kpiLabel}>Total Orders</span>
              <span className={styles.kpiValue}>{metrics?.totalOrdersCount ?? 0}</span>
              <span className={styles.kpiFoot}>
                {metrics?.paidOrdersCount ?? 0} Paid · {metrics?.shippedOrdersCount ?? 0} Shipped
              </span>
            </div>
            <div className={styles.kpiCard}>
              <span className={styles.kpiLabel}>Registered Customers</span>
              <span className={styles.kpiValue}>{metrics?.customersCount ?? 0}</span>
              <span className={styles.kpiFoot}>Unique ordering accounts</span>
            </div>
            <div className={styles.kpiCard}>
              <span className={styles.kpiLabel}>Customer Wallet Reserves</span>
              <span className={styles.kpiValue}>
                ₹{metrics?.totalWalletBalanceRupees ?? "0.00"}
              </span>
              <span className={styles.kpiFoot}>
                ₹{metrics?.totalEarnedReferralRupees ?? "0.00"} referral kickbacks
              </span>
            </div>
          </section>

          {/* Quick Actions & Recent Orders Table */}
          <section className={styles.card}>
            <div className={styles.cardHeader}>
              <h2 className={styles.cardTitle}>Recent Orders</h2>
              <button
                type="button"
                className={styles.actionBtn}
                onClick={() => setActiveTab("orders")}
              >
                View all orders &rarr;
              </button>
            </div>

            <div className={styles.tableWrap}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>Order #</th>
                    <th>Date</th>
                    <th>Customer</th>
                    <th>Items</th>
                    <th>Total</th>
                    <th>Status</th>
                    <th>Tracking</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {recentOrders.length === 0 ? (
                    <tr>
                      <td colSpan={8}>
                        <div className={styles.emptyState}>
                          <h4>No recent orders found</h4>
                          <p>New orders will automatically appear here once customers place them.</p>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    recentOrders.map((ord) => (
                      <tr key={ord.id}>
                        <td>
                          <strong>{ord.orderNumber}</strong>
                        </td>
                        <td>
                          {new Date(ord.createdAt).toLocaleDateString("en-IN", {
                            day: "numeric",
                            month: "short",
                            year: "numeric",
                          })}
                        </td>
                        <td>
                          <div>{ord.customerEmail}</div>
                          {ord.customerPhone && (
                            <small style={{ color: "#797368" }}>+91 {ord.customerPhone}</small>
                          )}
                        </td>
                        <td style={{ maxWidth: 220, overflow: "hidden", textOverflow: "ellipsis" }}>
                          {ord.itemsSummary}
                        </td>
                        <td>
                          <strong>₹{ord.totalRupees}</strong>
                        </td>
                        <td>{getStatusBadge(ord.status, ord.paymentStatus)}</td>
                        <td>
                          {ord.trackingAwb ? (
                            <a
                              href={`https://shiprocket.co/tracking/${ord.trackingAwb}`}
                              target="_blank"
                              rel="noreferrer"
                              style={{ color: "#1a73e8", fontWeight: 600, textDecoration: "none" }}
                            >
                              {ord.courierName ? `${ord.courierName}: ` : ""}
                              {ord.trackingAwb}
                            </a>
                          ) : (
                            <span style={{ color: "#a59e92" }}>Unassigned</span>
                          )}
                        </td>
                        <td>
                          <div className={styles.actionsCell}>
                            <a
                              href={`/api/orders/${ord.id}/invoice`}
                              target="_blank"
                              rel="noreferrer"
                              className={styles.actionBtn}
                              title="Download official Tax Invoice PDF"
                            >
                              <FileText size={13} /> Invoice
                            </a>
                            {ord.customerPhone && (
                              <Link
                                href={`/admin/whatsapp?phone=${cleanPhone(ord.customerPhone)}`}
                                className={styles.actionBtn}
                                title="Open WhatsApp chat with customer"
                              >
                                <MessageCircle size={13} /> Chat
                              </Link>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </section>
        </>
      )}

      {/* ─── TAB 2: ORDERS MANAGEMENT ─── */}
      {activeTab === "orders" && (
        <section className={styles.card}>
          <div className={styles.cardHeader}>
            <div>
              <h2 className={styles.cardTitle}>Orders Management</h2>
              <p style={{ margin: "0.25rem 0 0", color: "#797368", fontSize: "0.82rem" }}>
                Filter, view line items, download tax invoices, and record courier tracking AWBs.
              </p>
            </div>
            <div className={styles.filterBar}>
              <div className={styles.searchField}>
                <Search size={15} color="#797368" />
                <input
                  type="text"
                  placeholder="Search by order #, phone, email, name..."
                  value={orderSearch}
                  onChange={(e) => setOrderSearch(e.target.value)}
                />
                {orderSearch && (
                  <button
                    type="button"
                    onClick={() => setOrderSearch("")}
                    style={{ background: "transparent", border: 0, cursor: "pointer" }}
                  >
                    <X size={14} color="#797368" />
                  </button>
                )}
              </div>

              <select
                className={styles.selectInput}
                value={orderStatus}
                onChange={(e) => setOrderStatus(e.target.value)}
              >
                <option value="all">All Statuses</option>
                <option value="paid">Paid &amp; Captured</option>
                <option value="shipped">Shipped &amp; In Transit</option>
                <option value="pending">Pending</option>
                <option value="cancelled">Cancelled</option>
              </select>

              <a
                href="/api/admin/export?type=orders"
                className={styles.actionBtn}
                title="Download complete orders CSV"
              >
                <Download size={14} /> Export CSV
              </a>
            </div>
          </div>

          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Order # &amp; Date</th>
                  <th>Customer &amp; Shipping</th>
                  <th>Products Ordered</th>
                  <th>Price Breakdown</th>
                  <th>Payment Status</th>
                  <th>Fulfillment &amp; Courier</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {orders.length === 0 ? (
                  <tr>
                    <td colSpan={7}>
                      <div className={styles.emptyState}>
                        <h4>No orders found</h4>
                        <p>Try adjusting your search query or status filter.</p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  orders.map((ord) => (
                    <tr key={ord.id}>
                      <td>
                        <div style={{ fontWeight: 700 }}>{ord.orderNumber}</div>
                        <small style={{ color: "#797368" }}>
                          {new Date(ord.createdAt).toLocaleString("en-IN", {
                            day: "numeric",
                            month: "short",
                            year: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </small>
                      </td>
                      <td>
                        <div style={{ fontWeight: 600 }}>
                          {ord.shippingAddress?.fullName || ord.customerEmail}
                        </div>
                        <div style={{ fontSize: "0.76rem", color: "#555048" }}>
                          {ord.customerEmail}
                        </div>
                        {ord.customerPhone && (
                          <div style={{ fontSize: "0.76rem", color: "#555048" }}>
                            +91 {ord.customerPhone}
                          </div>
                        )}
                        {ord.shippingAddress?.city && (
                          <div style={{ fontSize: "0.72rem", color: "#8a6b2f" }}>
                            {ord.shippingAddress.city}, {ord.shippingAddress.state} -{" "}
                            {ord.shippingAddress.postalCode}
                          </div>
                        )}
                      </td>
                      <td>
                        <div style={{ display: "flex", flexDirection: "column", gap: "0.25rem" }}>
                          {ord.items.map((it, idx) => (
                            <div key={idx} style={{ fontSize: "0.8rem" }}>
                              <strong>{it.quantity}x</strong> {it.product_name} ({it.variant_label})
                            </div>
                          ))}
                        </div>
                      </td>
                      <td>
                        <div>
                          <strong>₹{ord.totalRupees}</strong>
                        </div>
                        <div style={{ fontSize: "0.72rem", color: "#797368" }}>
                          Items: ₹{ord.subtotalRupees} · Tax: ₹{ord.taxRupees}
                        </div>
                        {parseFloat(ord.walletSpentRupees) > 0 && (
                          <div style={{ fontSize: "0.72rem", color: "#137333" }}>
                            Wallet: -₹{ord.walletSpentRupees}
                          </div>
                        )}
                      </td>
                      <td>{getStatusBadge(ord.status, ord.paymentStatus)}</td>
                      <td>
                        {ord.trackingAwb ? (
                          <div>
                            <span className={`${styles.badge} ${styles.badgeShipped}`}>
                              {ord.courierName || "Dispatched"}
                            </span>
                            <div style={{ marginTop: "0.25rem" }}>
                              <a
                                href={
                                  ord.trackingUrl || `https://shiprocket.co/tracking/${ord.trackingAwb}`
                                }
                                target="_blank"
                                rel="noreferrer"
                                style={{
                                  fontSize: "0.76rem",
                                  color: "#1a73e8",
                                  textDecoration: "underline",
                                }}
                              >
                                {ord.trackingAwb}
                              </a>
                            </div>
                          </div>
                        ) : (
                          <button
                            type="button"
                            className={styles.actionBtn}
                            onClick={() => {
                              setShippingOrder(ord);
                              setAwbInput("");
                              setCourierInput("Shiprocket Express");
                            }}
                          >
                            <Truck size={13} /> Add AWB
                          </button>
                        )}
                      </td>
                      <td>
                        <div className={styles.actionsCell}>
                          <a
                            href={`/api/orders/${ord.id}/invoice`}
                            target="_blank"
                            rel="noreferrer"
                            className={styles.actionBtn}
                            title="Download official Tax Invoice PDF"
                          >
                            <FileText size={13} /> PDF
                          </a>
                          <button
                            type="button"
                            className={styles.actionBtn}
                            onClick={() => {
                              setShippingOrder(ord);
                              setAwbInput(ord.trackingAwb || "");
                              setCourierInput(ord.courierName || "Shiprocket Express");
                            }}
                            title="Update shipping & courier tracking"
                          >
                            <Truck size={13} /> Ship
                          </button>
                          {ord.customerPhone && (
                            <Link
                              href={`/admin/whatsapp?phone=${cleanPhone(ord.customerPhone)}`}
                              className={styles.actionBtn}
                              title="Message customer on WhatsApp"
                            >
                              <MessageCircle size={13} />
                            </Link>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* ─── TAB 3: CUSTOMERS & WALLETS ─── */}
      {activeTab === "customers" && (
        <section className={styles.card}>
          <div className={styles.cardHeader}>
            <div>
              <h2 className={styles.cardTitle}>Customers &amp; Digital Wallets</h2>
              <p style={{ margin: "0.25rem 0 0", color: "#797368", fontSize: "0.82rem" }}>
                Directory of customer accounts, lifetime spending, digital wallet credits, and referral codes.
              </p>
            </div>
            <div className={styles.filterBar}>
              <div className={styles.searchField}>
                <Search size={15} color="#797368" />
                <input
                  type="text"
                  placeholder="Search customer by name, email, phone..."
                  value={customerSearch}
                  onChange={(e) => setCustomerSearch(e.target.value)}
                />
                {customerSearch && (
                  <button
                    type="button"
                    onClick={() => setCustomerSearch("")}
                    style={{ background: "transparent", border: 0, cursor: "pointer" }}
                  >
                    <X size={14} color="#797368" />
                  </button>
                )}
              </div>
              <a
                href="/api/admin/export?type=customers"
                className={styles.actionBtn}
                title="Download complete customers CSV"
              >
                <Download size={14} /> Export CSV
              </a>
            </div>
          </div>

          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Customer</th>
                  <th>Contact Info</th>
                  <th>Total Orders</th>
                  <th>Lifetime Spend</th>
                  <th>Wallet Balance</th>
                  <th>Referral Code</th>
                  <th>First Purchase</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {customers.length === 0 ? (
                  <tr>
                    <td colSpan={8}>
                      <div className={styles.emptyState}>
                        <h4>No customers found</h4>
                        <p>Try searching by a different name, email, or phone number.</p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  customers.map((c) => (
                    <tr key={c.email}>
                      <td>
                        <strong>{c.fullName || "Zucero Patron"}</strong>
                      </td>
                      <td>
                        <div style={{ display: "flex", alignItems: "center", gap: "0.35rem" }}>
                          <Mail size={12} color="#797368" /> {c.email}
                        </div>
                        {c.phone && (
                          <div
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: "0.35rem",
                              marginTop: "0.2rem",
                              color: "#555048",
                            }}
                          >
                            <Phone size={12} color="#797368" /> +91 {c.phone}
                          </div>
                        )}
                      </td>
                      <td>
                        <strong>{c.ordersCount}</strong> {c.ordersCount === 1 ? "order" : "orders"}
                      </td>
                      <td>
                        <strong>₹{c.totalSpentRupees}</strong>
                      </td>
                      <td>
                        <span style={{ color: "#137333", fontWeight: 700 }}>
                          ₹{c.walletBalanceRupees}
                        </span>
                      </td>
                      <td>
                        <span
                          style={{
                            fontFamily: "monospace",
                            background: "#f4eee2",
                            padding: "0.15rem 0.4rem",
                            borderRadius: "4px",
                            fontSize: "0.8rem",
                          }}
                        >
                          {c.referralCode}
                        </span>
                      </td>
                      <td>
                        {new Date(c.firstOrderDate).toLocaleDateString("en-IN", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        })}
                      </td>
                      <td>
                        <div className={styles.actionsCell}>
                          {c.phone && (
                            <Link
                              href={`/admin/whatsapp?phone=${cleanPhone(c.phone)}`}
                              className={styles.actionBtn}
                              title="Message customer on WhatsApp"
                            >
                              <MessageCircle size={13} /> Chat
                            </Link>
                          )}
                          <button
                            type="button"
                            className={styles.actionBtn}
                            onClick={() => {
                              setActiveTab("orders");
                              setOrderSearch(c.email);
                            }}
                            title="Filter orders for this customer"
                          >
                            <Package size={13} /> Orders
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* ─── TAB 4: SUPABASE DATA EXPORT & HEALTH ─── */}
      {activeTab === "export" && (
        <section className={styles.card}>
          <div className={styles.cardHeader}>
            <div>
              <h2 className={styles.cardTitle}>Supabase Data Export &amp; Health Check</h2>
              <p style={{ margin: "0.25rem 0 0", color: "#797368", fontSize: "0.82rem" }}>
                Download complete database tables in standard CSV format for accounting, reporting, or backup.
              </p>
            </div>
          </div>

          {/* Database Health Summary */}
          <div className={styles.dbHealthGrid}>
            <div className={styles.dbHealthCard}>
              <span className={styles.dbTableName}>orders</span>
              <span className={styles.dbRowCount}>{metrics?.totalOrdersCount ?? 0}</span>
              <span className={styles.dbStatus}>
                <CheckCircle2 size={13} /> Connected &amp; Live
              </span>
            </div>
            <div className={styles.dbHealthCard}>
              <span className={styles.dbTableName}>wallets</span>
              <span className={styles.dbRowCount}>{metrics?.customersCount ?? 0}</span>
              <span className={styles.dbStatus}>
                <CheckCircle2 size={13} /> Connected &amp; Live
              </span>
            </div>
            <div className={styles.dbHealthCard}>
              <span className={styles.dbTableName}>contact_inquiries</span>
              <span className={styles.dbRowCount}>{metrics?.inquiriesCount ?? 0}</span>
              <span className={styles.dbStatus}>
                <CheckCircle2 size={13} /> Connected &amp; Live
              </span>
            </div>
            <div className={styles.dbHealthCard}>
              <span className={styles.dbTableName}>whatsapp_conversations</span>
              <span className={styles.dbRowCount}>{metrics?.waConversationsCount ?? 0}</span>
              <span className={styles.dbStatus}>
                <CheckCircle2 size={13} /> Connected &amp; Live
              </span>
            </div>
          </div>

          {/* Export Action Cards */}
          <div className={styles.exportGrid}>
            <div className={styles.exportCard}>
              <div className={styles.exportInfo}>
                <h3>📦 Orders Ledger CSV</h3>
                <p>
                  Export all historical orders, line items, customer contacts, delivery addresses, GST amounts, shipping fees, wallet discounts, total paid amounts, and courier AWB numbers.
                </p>
              </div>
              <a
                href="/api/admin/export?type=orders"
                className={styles.downloadBtn}
                download
              >
                <Download size={16} /> Download Orders CSV
              </a>
            </div>

            <div className={styles.exportCard}>
              <div className={styles.exportInfo}>
                <h3>👥 Customers &amp; Wallets CSV</h3>
                <p>
                  Export customer roster with verified email addresses, phone numbers, lifetime order counts, total gross spend, digital wallet credit balances, and unique referral codes.
                </p>
              </div>
              <a
                href="/api/admin/export?type=customers"
                className={styles.downloadBtn}
                download
              >
                <Download size={16} /> Download Customers CSV
              </a>
            </div>

            <div className={styles.exportCard}>
              <div className={styles.exportInfo}>
                <h3>💬 Contact Inquiries CSV</h3>
                <p>
                  Export all contact form submissions, customer queries, feedback messages, linked order numbers, and contact timestamps received via the website.
                </p>
              </div>
              <a
                href="/api/admin/export?type=inquiries"
                className={styles.downloadBtn}
                download
              >
                <Download size={16} /> Download Inquiries CSV
              </a>
            </div>
          </div>
        </section>
      )}

      {/* ─── MODAL: UPDATE TRACKING / AWB ─── */}
      {shippingOrder && (
        <div className={styles.modalBackdrop}>
          <div className={styles.modalCard}>
            <div className={styles.modalHeader}>
              <h3>Update Shipment Tracking</h3>
              <button
                type="button"
                className={styles.closeBtn}
                onClick={() => setShippingOrder(null)}
              >
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleSaveTracking} className={styles.modalForm}>
              <p style={{ margin: 0, fontSize: "0.85rem", color: "#555048" }}>
                Order: <strong>{shippingOrder.orderNumber}</strong> ({shippingOrder.customerEmail})
              </p>

              <div className={styles.formGroup}>
                <label htmlFor="courierName">Courier Partner</label>
                <input
                  id="courierName"
                  className={styles.formInput}
                  type="text"
                  placeholder="e.g. Shiprocket, BlueDart, Delhivery"
                  value={courierInput}
                  onChange={(e) => setCourierInput(e.target.value)}
                  required
                />
              </div>

              <div className={styles.formGroup}>
                <label htmlFor="awbInput">Air Waybill (AWB) / Tracking Code</label>
                <input
                  id="awbInput"
                  className={styles.formInput}
                  type="text"
                  placeholder="e.g. 143289012384"
                  value={awbInput}
                  onChange={(e) => setAwbInput(e.target.value)}
                  required
                  autoFocus
                />
              </div>

              <div className={styles.modalActions}>
                <button
                  type="button"
                  className={styles.modalCancelBtn}
                  onClick={() => setShippingOrder(null)}
                  disabled={isUpdatingTracking}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className={styles.modalSaveBtn}
                  disabled={isUpdatingTracking || !awbInput.trim()}
                >
                  {isUpdatingTracking ? (
                    <>
                      <RefreshCw size={14} className="spin" /> Saving...
                    </>
                  ) : (
                    <>
                      <Truck size={14} /> Mark Shipped
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
