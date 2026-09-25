"use client";

import { useCallback, useEffect, useState } from "react";
import {
  CheckCircle2,
  ExternalLink,
  FileText,
  Globe,
  History,
  Image as ImageIcon,
  Layers,
  Package,
  Plus,
  RefreshCw,
  RotateCcw,
  Save,
  Sparkles,
  Trash2,
  Upload,
  User,
  ArrowUp,
  ArrowDown,
  Phone,
} from "lucide-react";
import type { CMSCommit, CMSConfig, ProductVariant } from "@/lib/cms";

type SectionTab = "products" | "homepage" | "promotions" | "founder" | "contact" | "commits";

export function AdminCMSEditor() {
  const [config, setConfig] = useState<CMSConfig | null>(null);
  const [originalJson, setOriginalJson] = useState<string>("");
  const [commits, setCommits] = useState<CMSCommit[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingKey, setUploadingKey] = useState<string | null>(null);
  const [activeSection, setActiveSection] = useState<SectionTab>("products");
  const [selectedProductIdx, setSelectedProductIdx] = useState<number>(0);
  const [selectedVariantIdx, setSelectedVariantIdx] = useState<number>(0);
  const [commitMessage, setCommitMessage] = useState("");
  const [toast, setToast] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const showToast = (type: "success" | "error", text: string) => {
    setToast({ type, text });
    window.setTimeout(() => setToast(null), 5000);
  };

  const fetchCMS = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/cms", { cache: "no-store" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to load CMS");
      setConfig(data.config);
      setOriginalJson(JSON.stringify(data.config));
      setCommits(data.commits || []);
    } catch (err) {
      showToast("error", err instanceof Error ? err.message : "Failed to load website content");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchCMS();
  }, [fetchCMS]);

  const hasChanges = config ? JSON.stringify(config) !== originalJson : false;

  async function handleFileUpload(file: File, keyId: string, onUploaded: (url: string) => void) {
    setUploadingKey(keyId);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/admin/cms/upload", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      if (!res.ok || !data.url) {
        throw new Error(data.error || "Image upload failed");
      }
      onUploaded(data.url);
      showToast("success", `Uploaded ${data.fileName} — click "Save & Commit" to publish live!`);
    } catch (err) {
      showToast("error", err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploadingKey(null);
    }
  }

  async function handleSaveAndCommit(customConfig?: CMSConfig, customMsg?: string) {
    const targetConfig = customConfig ?? config;
    if (!targetConfig) return;
    setSaving(true);
    try {
      const res = await fetch("/api/admin/cms", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          config: targetConfig,
          commitMessage:
            customMsg ||
            commitMessage.trim() ||
            `Updated ${activeSection} section on live website`,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to commit changes");
      setConfig(data.config);
      setOriginalJson(JSON.stringify(data.config));
      setCommits(data.commits || []);
      setCommitMessage("");
      showToast("success", "✅ Changes saved, committed, and published live on thegoodsugar.in!");
    } catch (err) {
      showToast("error", err instanceof Error ? err.message : "Failed to save changes");
    } finally {
      setSaving(false);
    }
  }

  if (loading || !config) {
    return (
      <div style={cardStyle}>
        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", color: "#2f5d47", padding: "2rem" }}>
          <RefreshCw size={20} className="spin" />
          <strong>Loading Live Website CMS & Product Catalog…</strong>
        </div>
      </div>
    );
  }

  const currentProduct = config.products[selectedProductIdx] ?? config.products[0];
  const currentVariant = currentProduct?.variants[selectedVariantIdx] ?? currentProduct?.variants[0];

  const updateProductField = <K extends keyof typeof currentProduct>(field: K, value: (typeof currentProduct)[K]) => {
    const nextProducts = [...config.products];
    nextProducts[selectedProductIdx] = {
      ...currentProduct,
      [field]: value,
    };
    setConfig({ ...config, products: nextProducts });
  };

  const updateVariantField = (vIdx: number, updates: Partial<typeof currentVariant>) => {
    const nextProducts = [...config.products];
    const nextVariants = [...currentProduct.variants];
    nextVariants[vIdx] = {
      ...nextVariants[vIdx],
      ...updates,
    };
    nextProducts[selectedProductIdx] = {
      ...currentProduct,
      variants: nextVariants,
    };
    setConfig({ ...config, products: nextProducts });
  };

  const updateGalleryPhoto = (photoIdx: number, updates: Partial<{ src: string; label: string }>) => {
    const photos = [...(currentVariant.galleryPhotos || [])];
    photos[photoIdx] = { ...photos[photoIdx], ...updates };
    updateVariantField(selectedVariantIdx, { galleryPhotos: photos });
  };

  const addGalleryPhoto = (srcUrl?: string, labelText?: string) => {
    const photos = [...(currentVariant.galleryPhotos || [])];
    photos.push({
      src: srcUrl || currentProduct.image,
      label: labelText || `${currentProduct.name} (${currentVariant.label})`,
    });
    updateVariantField(selectedVariantIdx, { galleryPhotos: photos });
  };

  const removeGalleryPhoto = (photoIdx: number) => {
    const photos = (currentVariant.galleryPhotos || []).filter((_: unknown, i: number) => i !== photoIdx);
    updateVariantField(selectedVariantIdx, { galleryPhotos: photos });
  };

  const moveGalleryPhoto = (photoIdx: number, direction: -1 | 1) => {
    const photos = [...(currentVariant.galleryPhotos || [])];
    const targetIdx = photoIdx + direction;
    if (targetIdx < 0 || targetIdx >= photos.length) return;
    const temp = photos[photoIdx];
    photos[photoIdx] = photos[targetIdx];
    photos[targetIdx] = temp;
    updateVariantField(selectedVariantIdx, { galleryPhotos: photos });
  };

  const copyGalleryToAllVariants = () => {
    const photosToCopy = JSON.parse(JSON.stringify(currentVariant.galleryPhotos || []));
    const nextProducts = [...config.products];
    nextProducts[selectedProductIdx] = {
      ...currentProduct,
      variants: currentProduct.variants.map((v: ProductVariant) => ({
        ...v,
        galleryPhotos: JSON.parse(JSON.stringify(photosToCopy)),
      })),
    };
    setConfig({ ...config, products: nextProducts });
    showToast("success", `Copied gallery photos to all variants of ${currentProduct.name}`);
  };

  return (
    <div style={{ display: "grid", gap: "1.25rem" }}>
      {/* Sticky Commit & Status Header */}
      <div
        style={{
          ...cardStyle,
          background: "#102218",
          color: "#f4efe4",
          border: "1px solid rgba(216, 180, 86, 0.4)",
          position: "sticky",
          top: "72px",
          zIndex: 40,
          boxShadow: "0 10px 30px rgba(0,0,0,0.18)",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexWrap: "wrap",
            gap: "1rem",
          }}
        >
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
              <Globe size={18} color="#d8b456" />
              <span
                style={{
                  fontSize: "0.72rem",
                  textTransform: "uppercase",
                  letterSpacing: "0.14em",
                  color: "#d8b456",
                  fontWeight: 700,
                }}
              >
                Live Website Content & Product Manager
              </span>
              <span
                style={{
                  fontSize: "0.7rem",
                  padding: "0.15rem 0.55rem",
                  borderRadius: "99px",
                  fontWeight: 700,
                  background: hasChanges ? "rgba(234, 179, 8, 0.22)" : "rgba(34, 197, 94, 0.22)",
                  color: hasChanges ? "#fde047" : "#86efac",
                  border: `1px solid ${hasChanges ? "rgba(234,179,8,0.4)" : "rgba(34,197,94,0.4)"}`,
                }}
              >
                {hasChanges ? "● Unsaved Changes" : "✓ Synced with Live Website"}
              </span>
            </div>
            <p style={{ margin: "0.25rem 0 0", fontSize: "0.82rem", color: "#c4bfb3" }}>
              Select any page or section below, edit copy, prices, or upload product photos, then click{" "}
              <strong style={{ color: "#fff" }}>Save &amp; Commit</strong> to publish immediately.
            </p>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "0.6rem", flexWrap: "wrap", flex: "1 1 420px", justifyContent: "flex-end" }}>
            <input
              type="text"
              value={commitMessage}
              onChange={(e) => setCommitMessage(e.target.value)}
              placeholder="Commit note (e.g. Updated Khand price & gallery photos)…"
              style={{
                flex: "1 1 220px",
                maxWidth: "340px",
                padding: "0.55rem 0.85rem",
                borderRadius: "6px",
                border: "1px solid rgba(255,255,255,0.2)",
                background: "rgba(255,255,255,0.08)",
                color: "#fff",
                fontSize: "0.82rem",
              }}
            />

            {hasChanges && (
              <button
                type="button"
                onClick={() => {
                  setConfig(JSON.parse(originalJson));
                  showToast("success", "Discarded unsaved edits");
                }}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "0.35rem",
                  padding: "0.55rem 0.85rem",
                  borderRadius: "6px",
                  border: "1px solid rgba(255,255,255,0.22)",
                  background: "transparent",
                  color: "#e2ded6",
                  fontSize: "0.8rem",
                  fontWeight: 600,
                }}
              >
                <RotateCcw size={14} />
                Discard
              </button>
            )}

            <button
              type="button"
              disabled={saving}
              onClick={() => handleSaveAndCommit()}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "0.45rem",
                padding: "0.6rem 1.15rem",
                borderRadius: "6px",
                border: "1px solid #d8b456",
                background: "#d8b456",
                color: "#102218",
                fontSize: "0.82rem",
                fontWeight: 700,
                boxShadow: "0 4px 14px rgba(216, 180, 86, 0.3)",
              }}
            >
              <Save size={15} />
              {saving ? "Committing Live…" : "Save & Commit Live"}
            </button>

            <a
              href="/"
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "0.35rem",
                padding: "0.55rem 0.85rem",
                borderRadius: "6px",
                border: "1px solid rgba(255,255,255,0.2)",
                background: "rgba(255,255,255,0.06)",
                color: "#f4efe4",
                fontSize: "0.8rem",
                textDecoration: "none",
              }}
            >
              <ExternalLink size={14} />
              View Live
            </a>
          </div>
        </div>

        {toast && (
          <div
            style={{
              marginTop: "0.85rem",
              padding: "0.65rem 1rem",
              borderRadius: "6px",
              background: toast.type === "success" ? "rgba(22, 101, 52, 0.9)" : "rgba(153, 27, 27, 0.9)",
              color: "#fff",
              fontSize: "0.84rem",
              fontWeight: 600,
              display: "flex",
              alignItems: "center",
              gap: "0.5rem",
            }}
          >
            <CheckCircle2 size={16} />
            <span>{toast.text}</span>
          </div>
        )}
      </div>

      {/* Section / Page Selector Pills */}
      <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
        {[
          { id: "products", label: "Products, Prices & Gallery", Icon: Package },
          { id: "promotions", label: "Offers, Badges & Popups", Icon: Sparkles },
          { id: "homepage", label: "Homepage & Hero Copy", Icon: Layers },
          { id: "founder", label: "Founder & Story", Icon: User },
          { id: "contact", label: "Contact & Socials", Icon: Phone },
          { id: "commits", label: `Commit History (${commits.length})`, Icon: History },
        ].map(({ id, label, Icon }) => {
          const active = activeSection === id;
          return (
            <button
              key={id}
              type="button"
              onClick={() => setActiveSection(id as SectionTab)}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "0.45rem",
                padding: "0.6rem 1rem",
                borderRadius: "8px",
                fontSize: "0.83rem",
                fontWeight: 700,
                border: active ? "1px solid #102218" : "1px solid rgba(23,19,13,0.15)",
                background: active ? "#102218" : "#fff",
                color: active ? "#d8b456" : "#2b261f",
                transition: "all 0.15s ease",
              }}
            >
              <Icon size={15} />
              <span>{label}</span>
            </button>
          );
        })}
      </div>

      {/* 1. PRODUCTS, PRICES & GALLERY */}
      {activeSection === "products" && currentProduct && (
        <div style={{ display: "grid", gap: "1.25rem" }}>
          {/* Product Selector Bar */}
          <div style={cardStyle}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "1rem", marginBottom: "1rem" }}>
              <div>
                <h3 style={{ margin: 0, fontSize: "1.1rem", color: "#102218" }}>Select Product to Edit</h3>
                <p style={{ margin: "0.2rem 0 0", fontSize: "0.82rem", color: "#665e52" }}>
                  Update product titles, descriptions, ingredients, variant prices, and gallery photos.
                </p>
              </div>
              <div style={{ display: "flex", gap: "0.6rem", flexWrap: "wrap" }}>
                {config.products.map((prod, idx) => (
                  <button
                    key={prod.slug}
                    type="button"
                    onClick={() => {
                      setSelectedProductIdx(idx);
                      setSelectedVariantIdx(0);
                    }}
                    style={{
                      padding: "0.55rem 1.1rem",
                      borderRadius: "6px",
                      fontWeight: 700,
                      fontSize: "0.84rem",
                      border: selectedProductIdx === idx ? "2px solid #102218" : "1px solid #ccc4b4",
                      background: selectedProductIdx === idx ? "#f5ebd6" : "#fff",
                      color: "#102218",
                    }}
                  >
                    {idx + 1}. {prod.name}
                  </button>
                ))}
              </div>
            </div>

            {/* Product Details Form */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "1rem", borderTop: "1px solid #e6decb", paddingTop: "1rem" }}>
              <label style={labelStyle}>
                <span>Product Name</span>
                <input
                  type="text"
                  value={currentProduct.name}
                  onChange={(e) => updateProductField("name", e.target.value)}
                  style={inputStyle}
                />
              </label>

              <label style={labelStyle}>
                <span>Eyebrow / Subtitle Tagline</span>
                <input
                  type="text"
                  value={currentProduct.eyebrow}
                  onChange={(e) => updateProductField("eyebrow", e.target.value)}
                  style={inputStyle}
                />
              </label>

              <label style={{ ...labelStyle, gridColumn: "1 / -1" }}>
                <span>Product Description</span>
                <textarea
                  rows={2}
                  value={currentProduct.description}
                  onChange={(e) => updateProductField("description", e.target.value)}
                  style={inputStyle}
                />
              </label>

              <label style={{ ...labelStyle, gridColumn: "1 / -1" }}>
                <span>Ingredients Declaration</span>
                <input
                  type="text"
                  value={currentProduct.ingredients}
                  onChange={(e) => updateProductField("ingredients", e.target.value)}
                  style={inputStyle}
                />
              </label>

              {/* Main Product Image */}
              <div style={{ ...labelStyle, gridColumn: "1 / -1", background: "#faf7f0", padding: "1rem", borderRadius: "8px", border: "1px solid #e5dec9" }}>
                <span style={{ fontWeight: 700, color: "#102218" }}>Primary Product Card / Hero Image</span>
                <div style={{ display: "flex", gap: "1rem", alignItems: "center", flexWrap: "wrap", marginTop: "0.5rem" }}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={currentProduct.image}
                    alt={currentProduct.name}
                    style={{ width: "96px", height: "96px", objectFit: "cover", borderRadius: "8px", border: "1px solid #d4cbb8", background: "#fff" }}
                  />
                  <div style={{ flex: "1 1 260px", display: "grid", gap: "0.5rem" }}>
                    <input
                      type="text"
                      value={currentProduct.image}
                      onChange={(e) => {
                        updateProductField("image", e.target.value);
                        updateProductField("cartImage", e.target.value);
                      }}
                      placeholder="Image path or URL"
                      style={inputStyle}
                    />
                    <div style={{ display: "flex", gap: "0.6rem", alignItems: "center", flexWrap: "wrap" }}>
                      <label style={uploadBtnStyle}>
                        <Upload size={14} />
                        <span>{uploadingKey === `main-${currentProduct.slug}` ? "Uploading…" : "Upload & Replace Main Photo"}</span>
                        <input
                          type="file"
                          accept="image/*"
                          style={{ display: "none" }}
                          onChange={(e) => {
                            const f = e.target.files?.[0];
                            if (f) {
                              void handleFileUpload(f, `main-${currentProduct.slug}`, (url) => {
                                updateProductField("image", url);
                                updateProductField("cartImage", url);
                              });
                            }
                          }}
                        />
                      </label>
                      <small style={{ color: "#665e52", fontSize: "0.75rem" }}>Supports PNG, JPG, WebP, AVIF up to 10MB</small>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Variants & Prices Card */}
          <div style={cardStyle}>
            <h3 style={{ margin: "0 0 0.25rem", fontSize: "1.05rem", color: "#102218" }}>
              Sizes, Prices &amp; Weights — {currentProduct.name}
            </h3>
            <p style={{ margin: "0 0 1rem", fontSize: "0.82rem", color: "#665e52" }}>
              Updating a price here updates the Product Page, Collection Cards, Shopping Cart, and Razorpay Checkout calculation.
            </p>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: "1rem" }}>
              {currentProduct.variants.map((v: ProductVariant, vIdx: number) => (
                <div
                  key={v.id}
                  style={{
                    padding: "1rem",
                    borderRadius: "8px",
                    border: selectedVariantIdx === vIdx ? "2px solid #102218" : "1px solid #dcd4c4",
                    background: selectedVariantIdx === vIdx ? "#fdfaf2" : "#fff",
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.75rem" }}>
                    <strong style={{ fontSize: "0.95rem", color: "#102218" }}>
                      Variant {vIdx + 1}: {v.label} ({v.sku})
                    </strong>
                    <button
                      type="button"
                      onClick={() => setSelectedVariantIdx(vIdx)}
                      style={{
                        fontSize: "0.75rem",
                        padding: "0.25rem 0.6rem",
                        borderRadius: "4px",
                        border: "1px solid #102218",
                        background: selectedVariantIdx === vIdx ? "#102218" : "transparent",
                        color: selectedVariantIdx === vIdx ? "#d8b456" : "#102218",
                        fontWeight: 600,
                      }}
                    >
                      {selectedVariantIdx === vIdx ? "Editing Gallery Below" : "Edit Gallery"}
                    </button>
                  </div>

                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
                    <label style={labelStyle}>
                      <span>Size Label (e.g. 330 g)</span>
                      <input
                        type="text"
                        value={v.label}
                        onChange={(e) => updateVariantField(vIdx, { label: e.target.value })}
                        style={inputStyle}
                      />
                    </label>

                    <label style={labelStyle}>
                      <span>Selling Price (₹ INR)</span>
                      <input
                        type="number"
                        min={1}
                        step="1"
                        value={v.priceRupees ?? (v.pricePaise ? v.pricePaise / 100 : 0)}
                        onChange={(e) => {
                          const rupees = Number(e.target.value) || 0;
                          updateVariantField(vIdx, {
                            priceRupees: rupees,
                            pricePaise: Math.round(rupees * 100),
                          });
                        }}
                        style={{ ...inputStyle, fontWeight: 700, color: "#102218", borderColor: "#b89535" }}
                      />
                    </label>

                    <label style={labelStyle}>
                      <span>SKU Code</span>
                      <input
                        type="text"
                        value={v.sku}
                        onChange={(e) => updateVariantField(vIdx, { sku: e.target.value })}
                        style={inputStyle}
                      />
                    </label>

                    <label style={labelStyle}>
                      <span>Packed Shipping Weight (g)</span>
                      <input
                        type="number"
                        min={50}
                        value={v.packedWeightGrams}
                        onChange={(e) => {
                          const w = Number(e.target.value) || 500;
                          updateVariantField(vIdx, { packedWeightGrams: w, weightGrams: w });
                        }}
                        style={inputStyle}
                      />
                    </label>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Product Gallery Manager Card */}
          {currentVariant && (
            <div style={cardStyle}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "0.75rem", marginBottom: "1rem" }}>
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                    <ImageIcon size={18} color="#102218" />
                    <h3 style={{ margin: 0, fontSize: "1.05rem", color: "#102218" }}>
                      Product Gallery Photos — {currentProduct.name} ({currentVariant.label})
                    </h3>
                  </div>
                  <p style={{ margin: "0.25rem 0 0", fontSize: "0.8rem", color: "#665e52" }}>
                    Upload new photos, replace existing gallery slides, edit captions, or reorder how they appear on the product page.
                  </p>
                </div>

                <div style={{ display: "flex", gap: "0.6rem", flexWrap: "wrap" }}>
                  <button
                    type="button"
                    onClick={copyGalleryToAllVariants}
                    style={{
                      padding: "0.5rem 0.85rem",
                      borderRadius: "6px",
                      border: "1px solid #102218",
                      background: "#fff",
                      color: "#102218",
                      fontSize: "0.78rem",
                      fontWeight: 600,
                    }}
                  >
                    Copy Gallery to All Sizes
                  </button>

                  <label style={{ ...uploadBtnStyle, background: "#102218", color: "#d8b456" }}>
                    <Plus size={14} />
                    <span>{uploadingKey === "new-gallery-photo" ? "Uploading…" : "Upload & Add New Photo"}</span>
                    <input
                      type="file"
                      accept="image/*"
                      style={{ display: "none" }}
                      onChange={(e) => {
                        const f = e.target.files?.[0];
                        if (f) {
                          void handleFileUpload(f, "new-gallery-photo", (url) => {
                            addGalleryPhoto(url, `${currentProduct.name} ${currentVariant.label}`);
                          });
                        }
                      }}
                    />
                  </label>
                </div>
              </div>

              {/* Variant Tabs for Gallery */}
              <div style={{ display: "flex", gap: "0.5rem", marginBottom: "1rem" }}>
                {currentProduct.variants.map((v: ProductVariant, idx: number) => (
                  <button
                    key={v.id}
                    type="button"
                    onClick={() => setSelectedVariantIdx(idx)}
                    style={{
                      padding: "0.4rem 0.9rem",
                      borderRadius: "6px",
                      fontSize: "0.8rem",
                      fontWeight: 700,
                      border: selectedVariantIdx === idx ? "1px solid #102218" : "1px solid #d4cbb8",
                      background: selectedVariantIdx === idx ? "#102218" : "#f7f3e8",
                      color: selectedVariantIdx === idx ? "#fff" : "#3b352c",
                    }}
                  >
                    {v.label} Gallery ({(v.galleryPhotos || []).length} photos)
                  </button>
                ))}
              </div>

              <div style={{ display: "grid", gap: "0.85rem" }}>
                {(currentVariant.galleryPhotos || []).map((photo: { src: string; label: string }, pIdx: number) => (
                  <div
                    key={`${pIdx}-${photo.src}`}
                    style={{
                      display: "flex",
                      gap: "1rem",
                      alignItems: "center",
                      flexWrap: "wrap",
                      padding: "0.85rem",
                      borderRadius: "8px",
                      background: "#faf7f0",
                      border: "1px solid #e2dac9",
                    }}
                  >
                    <div style={{ position: "relative" }}>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={photo.src}
                        alt={photo.label}
                        style={{
                          width: "88px",
                          height: "88px",
                          objectFit: "cover",
                          borderRadius: "6px",
                          border: "1px solid #ccc2ae",
                          background: "#fff",
                        }}
                      />
                      <span
                        style={{
                          position: "absolute",
                          top: "4px",
                          left: "4px",
                          background: "rgba(16,34,24,0.85)",
                          color: "#fff",
                          fontSize: "0.65rem",
                          fontWeight: 700,
                          padding: "1px 6px",
                          borderRadius: "4px",
                        }}
                      >
                        #{pIdx + 1}
                      </span>
                    </div>

                    <div style={{ flex: "1 1 280px", display: "grid", gap: "0.5rem" }}>
                      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "0.5rem" }}>
                        <label style={labelStyle}>
                          <span>Caption / Alt Label</span>
                          <input
                            type="text"
                            value={photo.label}
                            onChange={(e) => updateGalleryPhoto(pIdx, { label: e.target.value })}
                            style={inputStyle}
                          />
                        </label>
                        <label style={labelStyle}>
                          <span>Image URL / Path</span>
                          <input
                            type="text"
                            value={photo.src}
                            onChange={(e) => updateGalleryPhoto(pIdx, { src: e.target.value })}
                            style={inputStyle}
                          />
                        </label>
                      </div>

                      <div style={{ display: "flex", gap: "0.5rem", alignItems: "center", flexWrap: "wrap" }}>
                        <label style={uploadBtnStyle}>
                          <Upload size={13} />
                          <span>
                            {uploadingKey === `gallery-${selectedVariantIdx}-${pIdx}`
                              ? "Uploading…"
                              : "Upload & Replace This Photo"}
                          </span>
                          <input
                            type="file"
                            accept="image/*"
                            style={{ display: "none" }}
                            onChange={(e) => {
                              const f = e.target.files?.[0];
                              if (f) {
                                void handleFileUpload(
                                  f,
                                  `gallery-${selectedVariantIdx}-${pIdx}`,
                                  (url) => updateGalleryPhoto(pIdx, { src: url })
                                );
                              }
                            }}
                          />
                        </label>

                        <button
                          type="button"
                          onClick={() => moveGalleryPhoto(pIdx, -1)}
                          disabled={pIdx === 0}
                          title="Move photo earlier"
                          style={iconBtnStyle}
                        >
                          <ArrowUp size={14} />
                        </button>

                        <button
                          type="button"
                          onClick={() => moveGalleryPhoto(pIdx, 1)}
                          disabled={pIdx === (currentVariant.galleryPhotos?.length ?? 1) - 1}
                          title="Move photo later"
                          style={iconBtnStyle}
                        >
                          <ArrowDown size={14} />
                        </button>

                        <button
                          type="button"
                          onClick={() => removeGalleryPhoto(pIdx)}
                          title="Delete photo from gallery"
                          style={{ ...iconBtnStyle, color: "#991b1b", borderColor: "#f8b4b4" }}
                        >
                          <Trash2 size={14} />
                          <span style={{ fontSize: "0.75rem", marginLeft: "0.25rem" }}>Remove</span>
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* 2. OFFERS, BADGES & POPUPS */}
      {activeSection === "promotions" && (
        <div style={cardStyle}>
          <h3 style={{ margin: "0 0 0.25rem", fontSize: "1.1rem", color: "#102218" }}>
            Offers, Introductory Price Notice &amp; Referral Popup
          </h3>
          <p style={{ margin: "0 0 1.25rem", fontSize: "0.82rem", color: "#665e52" }}>
            Control the promotional badges shown alongside product prices, collection headers, and the floating referral card.
          </p>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "1rem" }}>
            <label style={{ ...labelStyle, gridColumn: "1 / -1" }}>
              <span>Introductory Price Notice (shown everywhere prices appear)</span>
              <input
                type="text"
                value={config.promotions.introductoryPriceText}
                onChange={(e) =>
                  setConfig({
                    ...config,
                    promotions: { ...config.promotions, introductoryPriceText: e.target.value },
                  })
                }
                style={{ ...inputStyle, fontWeight: 700, borderColor: "#b89535" }}
              />
            </label>

            <label style={{ ...labelStyle, gridColumn: "1 / -1" }}>
              <span>Referral Discount Offer Line</span>
              <input
                type="text"
                value={config.promotions.referralOfferText}
                onChange={(e) =>
                  setConfig({
                    ...config,
                    promotions: { ...config.promotions, referralOfferText: e.target.value },
                  })
                }
                style={inputStyle}
              />
            </label>

            <label style={labelStyle}>
              <span>Collection Launch Banner Eyebrow</span>
              <input
                type="text"
                value={config.promotions.collectionBannerEyebrow}
                onChange={(e) =>
                  setConfig({
                    ...config,
                    promotions: { ...config.promotions, collectionBannerEyebrow: e.target.value },
                  })
                }
                style={inputStyle}
              />
            </label>

            <label style={labelStyle}>
              <span>Collection Launch Banner Subtitle</span>
              <input
                type="text"
                value={config.promotions.collectionBannerSubtitle}
                onChange={(e) =>
                  setConfig({
                    ...config,
                    promotions: { ...config.promotions, collectionBannerSubtitle: e.target.value },
                  })
                }
                style={inputStyle}
              />
            </label>

            <label style={labelStyle}>
              <span>Floating Referral Popup Eyebrow</span>
              <input
                type="text"
                value={config.promotions.popupEyebrow}
                onChange={(e) =>
                  setConfig({
                    ...config,
                    promotions: { ...config.promotions, popupEyebrow: e.target.value },
                  })
                }
                style={inputStyle}
              />
            </label>

            <label style={labelStyle}>
              <span>Floating Referral Popup Heading</span>
              <input
                type="text"
                value={config.promotions.popupHeading}
                onChange={(e) =>
                  setConfig({
                    ...config,
                    promotions: { ...config.promotions, popupHeading: e.target.value },
                  })
                }
                style={inputStyle}
              />
            </label>
          </div>
        </div>
      )}

      {/* 3. HOMEPAGE & HERO COPY */}
      {activeSection === "homepage" && (
        <div style={cardStyle}>
          <h3 style={{ margin: "0 0 0.25rem", fontSize: "1.1rem", color: "#102218" }}>
            Homepage Hero, Craft &amp; Philosophy Copy
          </h3>
          <p style={{ margin: "0 0 1.25rem", fontSize: "0.82rem", color: "#665e52" }}>
            Update headlines, subtitles, and imagery on the main landing page.
          </p>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "1rem" }}>
            <label style={labelStyle}>
              <span>Hero Eyebrow Text</span>
              <input
                type="text"
                value={config.homepage.heroEyebrow}
                onChange={(e) =>
                  setConfig({ ...config, homepage: { ...config.homepage, heroEyebrow: e.target.value } })
                }
                style={inputStyle}
              />
            </label>

            <label style={labelStyle}>
              <span>Hero CTA Button Text</span>
              <input
                type="text"
                value={config.homepage.heroButtonText}
                onChange={(e) =>
                  setConfig({ ...config, homepage: { ...config.homepage, heroButtonText: e.target.value } })
                }
                style={inputStyle}
              />
            </label>

            <label style={labelStyle}>
              <span>Hero Main Headline (Line 1)</span>
              <input
                type="text"
                value={config.homepage.heroTitleLine1}
                onChange={(e) =>
                  setConfig({ ...config, homepage: { ...config.homepage, heroTitleLine1: e.target.value } })
                }
                style={inputStyle}
              />
            </label>

            <label style={labelStyle}>
              <span>Hero Main Headline (Line 2 - Gold Accent)</span>
              <input
                type="text"
                value={config.homepage.heroTitleLine2}
                onChange={(e) =>
                  setConfig({ ...config, homepage: { ...config.homepage, heroTitleLine2: e.target.value } })
                }
                style={inputStyle}
              />
            </label>

            <label style={labelStyle}>
              <span>Hero Subtitle Line 1</span>
              <input
                type="text"
                value={config.homepage.heroSubtitleLine1}
                onChange={(e) =>
                  setConfig({ ...config, homepage: { ...config.homepage, heroSubtitleLine1: e.target.value } })
                }
                style={inputStyle}
              />
            </label>

            <label style={labelStyle}>
              <span>Hero Subtitle Line 2</span>
              <input
                type="text"
                value={config.homepage.heroSubtitleLine2}
                onChange={(e) =>
                  setConfig({ ...config, homepage: { ...config.homepage, heroSubtitleLine2: e.target.value } })
                }
                style={inputStyle}
              />
            </label>

            {/* Hero Poster Image */}
            <div style={{ ...labelStyle, gridColumn: "1 / -1", background: "#faf7f0", padding: "1rem", borderRadius: "8px", border: "1px solid #e2dac9" }}>
              <span style={{ fontWeight: 700, color: "#102218" }}>Hero Poster Image</span>
              <div style={{ display: "flex", gap: "1rem", alignItems: "center", flexWrap: "wrap", marginTop: "0.5rem" }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={config.homepage.heroPosterImage}
                  alt="Hero Poster"
                  style={{ width: "120px", height: "72px", objectFit: "cover", borderRadius: "6px", border: "1px solid #ccc2ae" }}
                />
                <div style={{ flex: "1 1 260px", display: "grid", gap: "0.5rem" }}>
                  <input
                    type="text"
                    value={config.homepage.heroPosterImage}
                    onChange={(e) =>
                      setConfig({ ...config, homepage: { ...config.homepage, heroPosterImage: e.target.value } })
                    }
                    style={inputStyle}
                  />
                  <label style={{ ...uploadBtnStyle, width: "fit-content" }}>
                    <Upload size={14} />
                    <span>{uploadingKey === "hero-poster" ? "Uploading…" : "Upload & Replace Hero Poster"}</span>
                    <input
                      type="file"
                      accept="image/*"
                      style={{ display: "none" }}
                      onChange={(e) => {
                        const f = e.target.files?.[0];
                        if (f) {
                          void handleFileUpload(f, "hero-poster", (url) =>
                            setConfig({ ...config, homepage: { ...config.homepage, heroPosterImage: url } })
                          );
                        }
                      }}
                    />
                  </label>
                </div>
              </div>
            </div>

            <label style={labelStyle}>
              <span>Collection Intro Quote (Line 1)</span>
              <input
                type="text"
                value={config.homepage.collectionIntroLine1}
                onChange={(e) =>
                  setConfig({ ...config, homepage: { ...config.homepage, collectionIntroLine1: e.target.value } })
                }
                style={inputStyle}
              />
            </label>

            <label style={labelStyle}>
              <span>Collection Intro Quote (Line 2)</span>
              <input
                type="text"
                value={config.homepage.collectionIntroLine2}
                onChange={(e) =>
                  setConfig({ ...config, homepage: { ...config.homepage, collectionIntroLine2: e.target.value } })
                }
                style={inputStyle}
              />
            </label>

            <label style={{ ...labelStyle, gridColumn: "1 / -1" }}>
              <span>Collection Section Subtitle</span>
              <input
                type="text"
                value={config.homepage.collectionSubtitle}
                onChange={(e) =>
                  setConfig({ ...config, homepage: { ...config.homepage, collectionSubtitle: e.target.value } })
                }
                style={inputStyle}
              />
            </label>

            <label style={{ ...labelStyle, gridColumn: "1 / -1" }}>
              <span>The Craft Section Lead Paragraph</span>
              <textarea
                rows={2}
                value={config.homepage.craftLead}
                onChange={(e) =>
                  setConfig({ ...config, homepage: { ...config.homepage, craftLead: e.target.value } })
                }
                style={inputStyle}
              />
            </label>
          </div>
        </div>
      )}

      {/* 4. FOUNDER & STORY */}
      {activeSection === "founder" && (
        <div style={cardStyle}>
          <h3 style={{ margin: "0 0 0.25rem", fontSize: "1.1rem", color: "#102218" }}>
            Founder’s Point of View Section
          </h3>
          <p style={{ margin: "0 0 1.25rem", fontSize: "0.82rem", color: "#665e52" }}>
            Update the founder portrait, quote, and lead story shown on the homepage.
          </p>

          <div style={{ display: "grid", gap: "1rem" }}>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: "1rem" }}>
              <label style={labelStyle}>
                <span>Founder Name</span>
                <input
                  type="text"
                  value={config.homepage.founderName}
                  onChange={(e) =>
                    setConfig({ ...config, homepage: { ...config.homepage, founderName: e.target.value } })
                  }
                  style={inputStyle}
                />
              </label>

              <label style={labelStyle}>
                <span>Founder Quote</span>
                <input
                  type="text"
                  value={config.homepage.founderQuote}
                  onChange={(e) =>
                    setConfig({ ...config, homepage: { ...config.homepage, founderQuote: e.target.value } })
                  }
                  style={inputStyle}
                />
              </label>
            </div>

            <label style={labelStyle}>
              <span>Founder Story Lead Paragraph</span>
              <textarea
                rows={3}
                value={config.homepage.founderStoryLead}
                onChange={(e) =>
                  setConfig({ ...config, homepage: { ...config.homepage, founderStoryLead: e.target.value } })
                }
                style={inputStyle}
              />
            </label>

            <div style={{ ...labelStyle, background: "#faf7f0", padding: "1rem", borderRadius: "8px", border: "1px solid #e2dac9" }}>
              <span style={{ fontWeight: 700, color: "#102218" }}>Founder Portrait Photo</span>
              <div style={{ display: "flex", gap: "1rem", alignItems: "center", flexWrap: "wrap", marginTop: "0.5rem" }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={config.homepage.founderImage}
                  alt={config.homepage.founderName}
                  style={{ width: "84px", height: "106px", objectFit: "cover", borderRadius: "6px", border: "1px solid #ccc2ae" }}
                />
                <div style={{ flex: "1 1 260px", display: "grid", gap: "0.5rem" }}>
                  <input
                    type="text"
                    value={config.homepage.founderImage}
                    onChange={(e) =>
                      setConfig({ ...config, homepage: { ...config.homepage, founderImage: e.target.value } })
                    }
                    style={inputStyle}
                  />
                  <label style={{ ...uploadBtnStyle, width: "fit-content" }}>
                    <Upload size={14} />
                    <span>{uploadingKey === "founder-photo" ? "Uploading…" : "Upload & Replace Portrait"}</span>
                    <input
                      type="file"
                      accept="image/*"
                      style={{ display: "none" }}
                      onChange={(e) => {
                        const f = e.target.files?.[0];
                        if (f) {
                          void handleFileUpload(f, "founder-photo", (url) =>
                            setConfig({ ...config, homepage: { ...config.homepage, founderImage: url } })
                          );
                        }
                      }}
                    />
                  </label>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 5. CONTACT & SOCIALS */}
      {activeSection === "contact" && (
        <div style={cardStyle}>
          <h3 style={{ margin: "0 0 0.25rem", fontSize: "1.1rem", color: "#102218" }}>
            Contact &amp; Social Channels
          </h3>
          <p style={{ margin: "0 0 1.25rem", fontSize: "0.82rem", color: "#665e52" }}>
            Update support contact details across the website.
          </p>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: "1rem" }}>
            <label style={labelStyle}>
              <span>WhatsApp Customer Care Number</span>
              <input
                type="text"
                value={config.contact.whatsappPhone}
                onChange={(e) =>
                  setConfig({ ...config, contact: { ...config.contact, whatsappPhone: e.target.value } })
                }
                style={inputStyle}
              />
            </label>

            <label style={labelStyle}>
              <span>Support Email Address</span>
              <input
                type="email"
                value={config.contact.supportEmail}
                onChange={(e) =>
                  setConfig({ ...config, contact: { ...config.contact, supportEmail: e.target.value } })
                }
                style={inputStyle}
              />
            </label>

            <label style={labelStyle}>
              <span>Instagram Profile URL</span>
              <input
                type="url"
                value={config.contact.instagramUrl}
                onChange={(e) =>
                  setConfig({ ...config, contact: { ...config.contact, instagramUrl: e.target.value } })
                }
                style={inputStyle}
              />
            </label>
          </div>
        </div>
      )}

      {/* 6. COMMIT HISTORY & ROLLBACK */}
      {activeSection === "commits" && (
        <div style={cardStyle}>
          <h3 style={{ margin: "0 0 0.25rem", fontSize: "1.1rem", color: "#102218" }}>
            Live Website Commit History &amp; Instant Rollback
          </h3>
          <p style={{ margin: "0 0 1.25rem", fontSize: "0.82rem", color: "#665e52" }}>
            Every time you click &ldquo;Save &amp; Commit Live&rdquo;, a version snapshot is saved here. You can restore any earlier version in 1 click.
          </p>

          {commits.length === 0 ? (
            <div style={{ padding: "2rem", textAlign: "center", color: "#665e52", background: "#faf7f0", borderRadius: "8px" }}>
              <FileText size={28} style={{ marginBottom: "0.5rem", opacity: 0.6 }} />
              <p style={{ margin: 0 }}>No commits recorded yet. Make an edit and click &ldquo;Save &amp; Commit Live&rdquo; to create your first snapshot.</p>
            </div>
          ) : (
            <div style={{ display: "grid", gap: "0.75rem" }}>
              {commits.map((c, idx) => (
                <div
                  key={c.id}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    flexWrap: "wrap",
                    gap: "1rem",
                    padding: "0.9rem 1.1rem",
                    borderRadius: "8px",
                    background: idx === 0 ? "#f4efe2" : "#faf7f0",
                    border: idx === 0 ? "1px solid #c9a449" : "1px solid #e2dac9",
                  }}
                >
                  <div>
                    <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                      <strong style={{ fontSize: "0.9rem", color: "#102218" }}>{c.message}</strong>
                      {idx === 0 && (
                        <span
                          style={{
                            fontSize: "0.65rem",
                            textTransform: "uppercase",
                            background: "#102218",
                            color: "#d8b456",
                            padding: "2px 7px",
                            borderRadius: "4px",
                            fontWeight: 700,
                          }}
                        >
                          Current Live
                        </span>
                      )}
                    </div>
                    <small style={{ color: "#665e52", fontSize: "0.76rem" }}>
                      Committed by {c.author} · {new Date(c.timestamp).toLocaleString("en-IN")} · ID: {c.id}
                    </small>
                  </div>

                  <button
                    type="button"
                    disabled={saving}
                    onClick={() => {
                      if (window.confirm(`Restore website to commit "${c.message}"?`)) {
                        void handleSaveAndCommit(c.configSnapshot, `Rollback to: ${c.message}`);
                      }
                    }}
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "0.35rem",
                      padding: "0.45rem 0.85rem",
                      borderRadius: "6px",
                      border: "1px solid #102218",
                      background: "#fff",
                      color: "#102218",
                      fontSize: "0.78rem",
                      fontWeight: 600,
                    }}
                  >
                    <RotateCcw size={13} />
                    Restore This Version
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

const cardStyle: React.CSSProperties = {
  background: "#fff",
  borderRadius: "10px",
  padding: "1.35rem 1.5rem",
  border: "1px solid rgba(23, 19, 13, 0.12)",
  boxShadow: "0 2px 10px rgba(0, 0, 0, 0.03)",
};

const labelStyle: React.CSSProperties = {
  display: "grid",
  gap: "0.35rem",
  fontSize: "0.78rem",
  fontWeight: 600,
  color: "#3d372e",
};

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "0.55rem 0.75rem",
  borderRadius: "6px",
  border: "1px solid #cfc6b4",
  background: "#fff",
  color: "#17130d",
  fontSize: "0.86rem",
  fontFamily: "inherit",
};

const uploadBtnStyle: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: "0.4rem",
  padding: "0.45rem 0.85rem",
  borderRadius: "6px",
  border: "1px solid #102218",
  background: "#f3ebd8",
  color: "#102218",
  fontSize: "0.78rem",
  fontWeight: 700,
  cursor: "pointer",
};

const iconBtnStyle: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  padding: "0.4rem 0.6rem",
  borderRadius: "6px",
  border: "1px solid #cfc6b4",
  background: "#fff",
  color: "#17130d",
  cursor: "pointer",
};
