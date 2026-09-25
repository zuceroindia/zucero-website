"use client";

import { useCallback, useEffect, useState } from "react";
import {
  AlertCircle,
  ArrowDown,
  ArrowUp,
  BookOpen,
  CheckCircle2,
  Code,
  ExternalLink,
  FileText,
  Globe,
  History,
  Image as ImageIcon,
  Layers,
  Package,
  Phone,
  Plus,
  RefreshCw,
  RotateCcw,
  Save,
  Shield,
  Sparkles,
  Trash2,
  Upload,
  User,
} from "lucide-react";
import type {
  CMSCommit,
  CMSConfig,
  CMSFAQItem,
  CMSHighlight,
  CMSNavLink,
  CMSSectionBlock,
  ProductVariant,
} from "@/lib/cms";

type MainTab =
  | "homepage"
  | "products"
  | "ourStory"
  | "contact"
  | "policies"
  | "guides"
  | "headerFooter"
  | "promotions"
  | "rawJson"
  | "commits";

type HomeSubTab =
  | "hero"
  | "highlights"
  | "problem"
  | "nature"
  | "craft"
  | "philosophy"
  | "founder"
  | "whyZucero"
  | "launchList";

type PolicySubTab = "shipping" | "returns" | "refunds" | "privacy" | "terms";
type GuideSubTab = "desiKhand" | "sugarAlternatives";

export function AdminCMSEditor() {
  const [config, setConfig] = useState<CMSConfig | null>(null);
  const [originalConfig, setOriginalConfig] = useState<CMSConfig | null>(null);
  const [commits, setCommits] = useState<CMSCommit[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [activeTab, setActiveTab] = useState<MainTab>("homepage");
  const [homeSubTab, setHomeSubTab] = useState<HomeSubTab>("hero");
  const [policySubTab, setPolicySubTab] = useState<PolicySubTab>("shipping");
  const [guideSubTab, setGuideSubTab] = useState<GuideSubTab>("desiKhand");
  const [selectedProductIdx, setSelectedProductIdx] = useState(0);
  const [selectedVariantIdx, setSelectedVariantIdx] = useState(0);
  const [commitMessage, setCommitMessage] = useState("");
  const [toast, setToast] = useState<{ type: "success" | "error" | "info"; message: string } | null>(null);

  // Raw JSON state
  const [rawJsonString, setRawJsonString] = useState("");
  const [rawJsonError, setRawJsonError] = useState<string | null>(null);

  const showToast = (type: "success" | "error" | "info", message: string) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 4500);
  };

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/cms");
      if (res.ok) {
        const json = await res.json();
        setConfig(json.config);
        setOriginalConfig(JSON.parse(JSON.stringify(json.config)));
        setRawJsonString(JSON.stringify(json.config, null, 2));
        setCommits(json.commits || []);
      } else {
        showToast("error", "Failed to fetch live website CMS configuration.");
      }
    } catch {
      showToast("error", "Error connecting to CMS backend.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Keep Raw JSON in sync when switching to rawJson tab
  useEffect(() => {
    if (activeTab === "rawJson" && config) {
      setRawJsonString(JSON.stringify(config, null, 2));
      setRawJsonError(null);
    }
  }, [activeTab, config]);

  const handleRawJsonChange = (val: string) => {
    setRawJsonString(val);
    try {
      const parsed = JSON.parse(val);
      setConfig(parsed);
      setRawJsonError(null);
    } catch (err: unknown) {
      setRawJsonError(err instanceof Error ? err.message : "Invalid JSON syntax");
    }
  };

  const formatRawJson = () => {
    try {
      const parsed = JSON.parse(rawJsonString);
      setRawJsonString(JSON.stringify(parsed, null, 2));
      setRawJsonError(null);
      showToast("success", "Formatted JSON successfully");
    } catch {
      setRawJsonError("Cannot format invalid JSON");
    }
  };

  const isDirty = Boolean(
    config && originalConfig && JSON.stringify(config) !== JSON.stringify(originalConfig)
  );

  const handleSave = async () => {
    if (!config) return;
    if (rawJsonError) {
      showToast("error", "Please fix the JSON errors before committing.");
      return;
    }
    setSaving(true);
    try {
      const message =
        commitMessage.trim() ||
        `Updated ${activeTab} section via Admin CMS (${new Date().toLocaleTimeString()})`;
      const res = await fetch("/api/admin/cms", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          config,
          commitMessage: message,
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        showToast("success", "Changes saved & committed! Live website updated.");
        setOriginalConfig(JSON.parse(JSON.stringify(config)));
        setCommitMessage("");
        if (data.commits) setCommits(data.commits);
      } else {
        showToast("error", data.error || "Failed to commit changes to Supabase CDN.");
      }
    } catch {
      showToast("error", "Network error while saving changes.");
    } finally {
      setSaving(false);
    }
  };

  const handleRollback = async (commitId: string) => {
    if (!confirm("Are you sure you want to rollback the live website to this version snapshot?")) return;
    setSaving(true);
    try {
      const res = await fetch("/api/admin/cms", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ commitId }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        showToast("success", "Successfully rolled back to snapshot!");
        setConfig(data.config);
        setOriginalConfig(JSON.parse(JSON.stringify(data.config)));
        setRawJsonString(JSON.stringify(data.config, null, 2));
        if (data.commits) setCommits(data.commits);
      } else {
        showToast("error", data.error || "Rollback failed.");
      }
    } catch {
      showToast("error", "Error requesting rollback.");
    } finally {
      setSaving(false);
    }
  };

  const handleImageUpload = async (file: File, onUploaded: (url: string) => void) => {
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/admin/cms/upload", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      if (res.ok && data.success && data.publicUrl) {
        onUploaded(data.publicUrl);
        showToast("success", "Image uploaded to CDN successfully!");
      } else {
        showToast("error", data.error || "Failed to upload image.");
      }
    } catch {
      showToast("error", "Error uploading image to server.");
    } finally {
      setUploading(false);
    }
  };

  // Keyboard shortcut Ctrl+S
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "s") {
        e.preventDefault();
        if (isDirty && !saving) handleSave();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isDirty, saving, config, commitMessage]);

  if (loading || !config) {
    return (
      <div style={{ padding: "3rem", textAlign: "center", color: "#555" }}>
        <RefreshCw className="animate-spin" size={28} style={{ margin: "0 auto 1rem" }} />
        <p style={{ fontWeight: 600 }}>Connecting to Live Website CMS...</p>
      </div>
    );
  }

  // Active live URL calculator
  const getLivePreviewUrl = () => {
    if (activeTab === "homepage") return "https://www.thegoodsugar.in";
    if (activeTab === "products") {
      const slug = config.products[selectedProductIdx]?.slug || "desi-khand";
      return `https://www.thegoodsugar.in/products/${slug}`;
    }
    if (activeTab === "ourStory") return "https://www.thegoodsugar.in/our-story";
    if (activeTab === "contact") return "https://www.thegoodsugar.in/contact";
    if (activeTab === "policies") return `https://www.thegoodsugar.in/${policySubTab}`;
    if (activeTab === "guides") {
      return guideSubTab === "desiKhand"
        ? "https://www.thegoodsugar.in/guides/desi-khand"
        : "https://www.thegoodsugar.in/guides/sugar-alternatives";
    }
    if (activeTab === "promotions") return "https://www.thegoodsugar.in/products";
    return "https://www.thegoodsugar.in";
  };

  // Safe product references
  const currentProduct = config.products[selectedProductIdx] || config.products[0];
  const currentVariant = currentProduct?.variants[selectedVariantIdx] || currentProduct?.variants[0];

  const updateProductField = (field: string, value: unknown) => {
    const nextProducts = [...config.products];
    nextProducts[selectedProductIdx] = {
      ...currentProduct,
      [field]: value,
    };
    setConfig({ ...config, products: nextProducts });
  };

  const updateVariantField = (vIdx: number, patch: Partial<ProductVariant>) => {
    const nextProducts = [...config.products];
    const nextVariants = [...currentProduct.variants];
    nextVariants[vIdx] = { ...nextVariants[vIdx], ...patch };
    nextProducts[selectedProductIdx] = {
      ...currentProduct,
      variants: nextVariants,
    };
    setConfig({ ...config, products: nextProducts });
  };

  const addGalleryPhoto = (srcUrl: string, labelText?: string) => {
    if (!currentVariant) return;
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

  // Helper styles
  const inputStyle = {
    width: "100%",
    padding: "0.55rem 0.75rem",
    borderRadius: "6px",
    border: "1px solid #dcd4c4",
    fontSize: "0.88rem",
    background: "#fff",
    fontFamily: "inherit",
    boxSizing: "border-box" as const,
  };

  const textareaStyle = {
    ...inputStyle,
    minHeight: "75px",
    resize: "vertical" as const,
    lineHeight: "1.45",
  };

  const labelStyle = {
    display: "block",
    fontSize: "0.78rem",
    fontWeight: 700,
    color: "#4a4235",
    marginBottom: "0.3rem",
    textTransform: "uppercase" as const,
    letterSpacing: "0.04em",
  };

  const cardStyle = {
    background: "#fff",
    border: "1px solid #e6decb",
    borderRadius: "10px",
    padding: "1.25rem",
    boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
  };

  const sectionSubNavBtnStyle = (active: boolean) => ({
    padding: "0.4rem 0.85rem",
    borderRadius: "6px",
    fontSize: "0.8rem",
    fontWeight: 600,
    cursor: "pointer",
    border: active ? "1px solid #102218" : "1px solid #d4cbb8",
    background: active ? "#102218" : "#fbf9f4",
    color: active ? "#fff" : "#4a4235",
    transition: "all 0.15s ease",
  });

  return (
    <div style={{ display: "grid", gap: "1.25rem" }}>
      {/* Sticky Header Bar */}
      <div
        style={{
          position: "sticky",
          top: "64px",
          zIndex: 40,
          background: "linear-gradient(to right, #102218, #183324)",
          color: "#fff",
          padding: "0.85rem 1.25rem",
          borderRadius: "10px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "1rem",
          boxShadow: "0 4px 14px rgba(0,0,0,0.2)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "0.85rem" }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0.4rem",
              background: "rgba(255,255,255,0.12)",
              padding: "0.25rem 0.65rem",
              borderRadius: "20px",
              fontSize: "0.75rem",
              fontWeight: 600,
            }}
          >
            <span
              style={{
                width: 8,
                height: 8,
                borderRadius: "50%",
                background: isDirty ? "#facc15" : "#4ade80",
                boxShadow: isDirty ? "0 0 8px #facc15" : "0 0 8px #4ade80",
              }}
            />
            {isDirty ? "Unsaved Changes" : "Live & Synced"}
          </div>

          <span style={{ fontSize: "0.82rem", color: "#d8cca8" }}>
            Updated: {new Date(config.updatedAt || Date.now()).toLocaleTimeString()}
          </span>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "0.6rem", flexWrap: "wrap" }}>
          <a
            href={getLivePreviewUrl()}
            target="_blank"
            rel="noreferrer"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "0.35rem",
              background: "rgba(255,255,255,0.1)",
              border: "1px solid rgba(255,255,255,0.2)",
              color: "#fff",
              padding: "0.45rem 0.85rem",
              borderRadius: "6px",
              fontSize: "0.78rem",
              fontWeight: 600,
              textDecoration: "none",
            }}
          >
            <ExternalLink size={14} /> View Page on Site
          </a>

          {isDirty && (
            <button
              type="button"
              onClick={() => {
                if (confirm("Discard all unsaved edits and reload from live site?")) {
                  setConfig(JSON.parse(JSON.stringify(originalConfig)));
                  showToast("info", "Unsaved changes discarded.");
                }
              }}
              style={{
                background: "transparent",
                border: "1px solid rgba(255,255,255,0.3)",
                color: "#e2dac9",
                padding: "0.45rem 0.85rem",
                borderRadius: "6px",
                fontSize: "0.78rem",
                cursor: "pointer",
              }}
            >
              Discard
            </button>
          )}

          <button
            type="button"
            disabled={saving || !isDirty}
            onClick={handleSave}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "0.4rem",
              background: isDirty ? "#d8b456" : "#606a64",
              color: isDirty ? "#102218" : "#9ca3af",
              border: "none",
              padding: "0.5rem 1.15rem",
              borderRadius: "6px",
              fontSize: "0.82rem",
              fontWeight: 700,
              cursor: isDirty && !saving ? "pointer" : "not-allowed",
              boxShadow: isDirty ? "0 2px 8px rgba(216,180,86,0.4)" : "none",
              transition: "all 0.15s ease",
            }}
          >
            <Save size={15} />
            {saving ? "Saving & Committing..." : "Save & Commit (Ctrl+S)"}
          </button>
        </div>
      </div>

      {/* Toast Notification */}
      {toast && (
        <div
          style={{
            padding: "0.75rem 1rem",
            borderRadius: "6px",
            fontSize: "0.85rem",
            fontWeight: 600,
            display: "flex",
            alignItems: "center",
            gap: "0.5rem",
            background:
              toast.type === "success" ? "#ecfdf5" : toast.type === "error" ? "#fef2f2" : "#f0fdf4",
            color:
              toast.type === "success" ? "#065f46" : toast.type === "error" ? "#991b1b" : "#166534",
            border: `1px solid ${
              toast.type === "success" ? "#a7f3d0" : toast.type === "error" ? "#fecaca" : "#bbf7d0"
            }`,
          }}
        >
          {toast.type === "success" ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
          {toast.message}
        </div>
      )}

      {/* Main Navigation Tabs */}
      <div
        style={{
          display: "flex",
          gap: "0.4rem",
          overflowX: "auto",
          paddingBottom: "0.35rem",
          borderBottom: "2px solid #e6decb",
        }}
      >
        {[
          { id: "homepage", label: "🏠 Homepage", icon: Globe },
          { id: "products", label: "🛍️ Products & Prices", icon: Package },
          { id: "ourStory", label: "📖 Our Story", icon: BookOpen },
          { id: "contact", label: "📞 Contact Us", icon: Phone },
          { id: "policies", label: "⚖️ Legal & Policies", icon: Shield },
          { id: "guides", label: "📚 Guides & Educational", icon: Layers },
          { id: "headerFooter", label: "📢 Header & Footer", icon: Sparkles },
          { id: "promotions", label: "🏷️ Promotions", icon: Sparkles },
          { id: "rawJson", label: "💻 Raw JSON Editor", icon: Code },
          { id: "commits", label: "📜 Commit History", icon: History },
        ].map((tab) => {
          const active = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id as MainTab)}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "0.4rem",
                padding: "0.55rem 1rem",
                borderRadius: "8px 8px 0 0",
                fontSize: "0.83rem",
                fontWeight: active ? 700 : 500,
                cursor: "pointer",
                border: active ? "1px solid #102218" : "1px solid transparent",
                borderBottom: active ? "2px solid #d8b456" : "1px solid transparent",
                background: active ? "#102218" : "transparent",
                color: active ? "#fff" : "#554c3e",
                whiteSpace: "nowrap",
                transition: "all 0.15s ease",
              }}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Optional Commit Message Bar */}
      {isDirty && (
        <div
          style={{
            background: "#fcfaf4",
            padding: "0.75rem 1rem",
            borderRadius: "8px",
            border: "1px dashed #d8b456",
            display: "flex",
            alignItems: "center",
            gap: "0.75rem",
          }}
        >
          <span style={{ fontSize: "0.78rem", fontWeight: 700, color: "#8a6616", whiteSpace: "nowrap" }}>
            Commit Note:
          </span>
          <input
            style={{ ...inputStyle, background: "#fff", flex: 1 }}
            placeholder="e.g. Updated launch pricing for 500g jar and revised shipping timeline"
            value={commitMessage}
            onChange={(e) => setCommitMessage(e.target.value)}
          />
        </div>
      )}

      {/* ========================================================================= */}
      {/* 1. HOMEPAGE TAB                                                           */}
      {/* ========================================================================= */}
      {activeTab === "homepage" && (
        <div style={{ display: "grid", gap: "1.25rem" }}>
          {/* Sub Navigation */}
          <div style={{ display: "flex", gap: "0.4rem", flexWrap: "wrap" }}>
            {[
              { id: "hero", label: "Hero Banner" },
              { id: "highlights", label: "Highlights Marquee" },
              { id: "problem", label: "01 · Sugar Problem" },
              { id: "nature", label: "02 · Nature's Solution" },
              { id: "craft", label: "03 · The Craft" },
              { id: "philosophy", label: "05 · Philosophy" },
              { id: "founder", label: "06 · Founder Story" },
              { id: "whyZucero", label: "10 · Why Zucero" },
              { id: "launchList", label: "11 · Launch List" },
            ].map((sub) => (
              <button
                key={sub.id}
                type="button"
                onClick={() => setHomeSubTab(sub.id as HomeSubTab)}
                style={sectionSubNavBtnStyle(homeSubTab === sub.id)}
              >
                {sub.label}
              </button>
            ))}
          </div>

          {/* Sub-section: Hero */}
          {homeSubTab === "hero" && (
            <div style={cardStyle}>
              <h3 style={{ margin: "0 0 1rem", fontSize: "1.05rem", color: "#102218" }}>
                Homepage Hero Banner
              </h3>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "1rem" }}>
                <div>
                  <label style={labelStyle}>Hero Eyebrow</label>
                  <input
                    style={inputStyle}
                    value={config.homepage.heroEyebrow}
                    onChange={(e) =>
                      setConfig({ ...config, homepage: { ...config.homepage, heroEyebrow: e.target.value } })
                    }
                  />
                </div>
                <div>
                  <label style={labelStyle}>Button Call-to-Action Text</label>
                  <input
                    style={inputStyle}
                    value={config.homepage.heroButtonText}
                    onChange={(e) =>
                      setConfig({ ...config, homepage: { ...config.homepage, heroButtonText: e.target.value } })
                    }
                  />
                </div>
                <div>
                  <label style={labelStyle}>Title Line 1</label>
                  <input
                    style={inputStyle}
                    value={config.homepage.heroTitleLine1}
                    onChange={(e) =>
                      setConfig({ ...config, homepage: { ...config.homepage, heroTitleLine1: e.target.value } })
                    }
                  />
                </div>
                <div>
                  <label style={labelStyle}>Title Line 2 (Italic)</label>
                  <input
                    style={inputStyle}
                    value={config.homepage.heroTitleLine2}
                    onChange={(e) =>
                      setConfig({ ...config, homepage: { ...config.homepage, heroTitleLine2: e.target.value } })
                    }
                  />
                </div>
                <div>
                  <label style={labelStyle}>Subtitle Line 1</label>
                  <input
                    style={inputStyle}
                    value={config.homepage.heroSubtitleLine1}
                    onChange={(e) =>
                      setConfig({ ...config, homepage: { ...config.homepage, heroSubtitleLine1: e.target.value } })
                    }
                  />
                </div>
                <div>
                  <label style={labelStyle}>Subtitle Line 2</label>
                  <input
                    style={inputStyle}
                    value={config.homepage.heroSubtitleLine2}
                    onChange={(e) =>
                      setConfig({ ...config, homepage: { ...config.homepage, heroSubtitleLine2: e.target.value } })
                    }
                  />
                </div>
                <div style={{ gridColumn: "1 / -1" }}>
                  <label style={labelStyle}>Hero Video Embed URL (Iframe Source)</label>
                  <input
                    style={inputStyle}
                    value={config.homepage.heroVideoUrl || ""}
                    onChange={(e) =>
                      setConfig({ ...config, homepage: { ...config.homepage, heroVideoUrl: e.target.value } })
                    }
                  />
                </div>
                <div style={{ gridColumn: "1 / -1" }}>
                  <label style={labelStyle}>Hero Poster Image URL</label>
                  <div style={{ display: "flex", gap: "0.5rem" }}>
                    <input
                      style={inputStyle}
                      value={config.homepage.heroPosterImage}
                      onChange={(e) =>
                        setConfig({ ...config, homepage: { ...config.homepage, heroPosterImage: e.target.value } })
                      }
                    />
                    <label
                      style={{
                        padding: "0.5rem 0.85rem",
                        background: "#f4ede0",
                        borderRadius: "6px",
                        fontSize: "0.78rem",
                        fontWeight: 600,
                        cursor: "pointer",
                        whiteSpace: "nowrap",
                        display: "flex",
                        alignItems: "center",
                        gap: "0.3rem",
                      }}
                    >
                      <Upload size={14} /> Upload
                      <input
                        type="file"
                        accept="image/*"
                        style={{ display: "none" }}
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            handleImageUpload(file, (url) => {
                              setConfig({ ...config, homepage: { ...config.homepage, heroPosterImage: url } });
                            });
                          }
                        }}
                      />
                    </label>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Sub-section: Highlights */}
          {homeSubTab === "highlights" && (
            <div style={cardStyle}>
              <h3 style={{ margin: "0 0 0.5rem", fontSize: "1.05rem", color: "#102218" }}>
                Homepage Highlights Marquee
              </h3>
              <p style={{ margin: "0 0 1rem", fontSize: "0.82rem", color: "#665e52" }}>
                The four highlight badges cycling in the marquee strip below the hero.
              </p>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "1rem" }}>
                {(config.homepage.highlights || []).map((item, idx) => (
                  <div key={idx} style={{ background: "#fbf9f4", padding: "1rem", borderRadius: "8px", border: "1px solid #e2dac9" }}>
                    <span style={{ fontSize: "0.75rem", fontWeight: 700, color: "#8a6616" }}>Badge 0{idx + 1}</span>
                    <div style={{ marginTop: "0.5rem" }}>
                      <label style={labelStyle}>Title</label>
                      <input
                        style={inputStyle}
                        value={item.title}
                        onChange={(e) => {
                          const next = [...config.homepage.highlights];
                          next[idx] = { ...next[idx], title: e.target.value };
                          setConfig({ ...config, homepage: { ...config.homepage, highlights: next } });
                        }}
                      />
                    </div>
                    <div style={{ marginTop: "0.5rem" }}>
                      <label style={labelStyle}>Description</label>
                      <input
                        style={inputStyle}
                        value={item.description}
                        onChange={(e) => {
                          const next = [...config.homepage.highlights];
                          next[idx] = { ...next[idx], description: e.target.value };
                          setConfig({ ...config, homepage: { ...config.homepage, highlights: next } });
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Sub-section: The Sugar Problem */}
          {homeSubTab === "problem" && (
            <div style={cardStyle}>
              <h3 style={{ margin: "0 0 1rem", fontSize: "1.05rem", color: "#102218" }}>
                Section 01: The Sugar Problem
              </h3>
              <div style={{ display: "grid", gap: "1rem" }}>
                <div>
                  <label style={labelStyle}>Eyebrow Title</label>
                  <input
                    style={inputStyle}
                    value={config.homepage.sugarProblemEyebrow || "01 · The Sugar Problem"}
                    onChange={(e) =>
                      setConfig({ ...config, homepage: { ...config.homepage, sugarProblemEyebrow: e.target.value } })
                    }
                  />
                </div>
                <div>
                  <label style={labelStyle}>Heading</label>
                  <input
                    style={inputStyle}
                    value={config.homepage.sugarProblemHeading}
                    onChange={(e) =>
                      setConfig({ ...config, homepage: { ...config.homepage, sugarProblemHeading: e.target.value } })
                    }
                  />
                </div>
                <div>
                  <label style={labelStyle}>Narrative Paragraphs (One per box)</label>
                  <div style={{ display: "grid", gap: "0.5rem" }}>
                    {(config.homepage.sugarProblemParagraphs || []).map((p, idx) => (
                      <div key={idx} style={{ display: "flex", gap: "0.5rem" }}>
                        <textarea
                          style={{ ...textareaStyle, minHeight: "55px", flex: 1 }}
                          value={p}
                          onChange={(e) => {
                            const next = [...config.homepage.sugarProblemParagraphs];
                            next[idx] = e.target.value;
                            setConfig({ ...config, homepage: { ...config.homepage, sugarProblemParagraphs: next } });
                          }}
                        />
                        <button
                          type="button"
                          onClick={() => {
                            const next = config.homepage.sugarProblemParagraphs.filter((_, i) => i !== idx);
                            setConfig({ ...config, homepage: { ...config.homepage, sugarProblemParagraphs: next } });
                          }}
                          style={{ background: "#fef2f2", border: "1px solid #fecaca", borderRadius: "6px", padding: "0 0.6rem", color: "#991b1b", cursor: "pointer" }}
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    ))}
                    <button
                      type="button"
                      onClick={() => {
                        const next = [...(config.homepage.sugarProblemParagraphs || []), "New paragraph text..."];
                        setConfig({ ...config, homepage: { ...config.homepage, sugarProblemParagraphs: next } });
                      }}
                      style={{ alignSelf: "start", padding: "0.4rem 0.8rem", background: "#f7f3e8", border: "1px solid #dcd4c4", borderRadius: "6px", fontSize: "0.78rem", fontWeight: 600, cursor: "pointer" }}
                    >
                      + Add Paragraph
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Sub-section: Nature's Solution */}
          {homeSubTab === "nature" && (
            <div style={cardStyle}>
              <h3 style={{ margin: "0 0 1rem", fontSize: "1.05rem", color: "#102218" }}>
                Section 02: Nature’s Solution
              </h3>
              <div style={{ display: "grid", gap: "1rem" }}>
                <div>
                  <label style={labelStyle}>Overlay Section Title</label>
                  <input
                    style={inputStyle}
                    value={config.homepage.natureSolutionOverlayTitle || "Nature’s Solution"}
                    onChange={(e) =>
                      setConfig({ ...config, homepage: { ...config.homepage, natureSolutionOverlayTitle: e.target.value } })
                    }
                  />
                </div>
                <div>
                  <label style={labelStyle}>Heading</label>
                  <input
                    style={inputStyle}
                    value={config.homepage.natureSolutionHeading}
                    onChange={(e) =>
                      setConfig({ ...config, homepage: { ...config.homepage, natureSolutionHeading: e.target.value } })
                    }
                  />
                </div>
                <div>
                  <label style={labelStyle}>Art Image URL</label>
                  <div style={{ display: "flex", gap: "0.5rem" }}>
                    <input
                      style={inputStyle}
                      value={config.homepage.natureSolutionImage}
                      onChange={(e) =>
                        setConfig({ ...config, homepage: { ...config.homepage, natureSolutionImage: e.target.value } })
                      }
                    />
                    <label
                      style={{
                        padding: "0.5rem 0.85rem",
                        background: "#f4ede0",
                        borderRadius: "6px",
                        fontSize: "0.78rem",
                        fontWeight: 600,
                        cursor: "pointer",
                        whiteSpace: "nowrap",
                        display: "flex",
                        alignItems: "center",
                        gap: "0.3rem",
                      }}
                    >
                      <Upload size={14} /> Upload
                      <input
                        type="file"
                        accept="image/*"
                        style={{ display: "none" }}
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            handleImageUpload(file, (url) => {
                              setConfig({ ...config, homepage: { ...config.homepage, natureSolutionImage: url } });
                            });
                          }
                        }}
                      />
                    </label>
                  </div>
                </div>
                <div>
                  <label style={labelStyle}>Paragraphs</label>
                  {(config.homepage.natureSolutionParagraphs || []).map((p, idx) => (
                    <div key={idx} style={{ display: "flex", gap: "0.5rem", marginBottom: "0.5rem" }}>
                      <textarea
                        style={{ ...textareaStyle, minHeight: "55px", flex: 1 }}
                        value={p}
                        onChange={(e) => {
                          const next = [...config.homepage.natureSolutionParagraphs];
                          next[idx] = e.target.value;
                          setConfig({ ...config, homepage: { ...config.homepage, natureSolutionParagraphs: next } });
                        }}
                      />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Sub-section: The Craft */}
          {homeSubTab === "craft" && (
            <div style={cardStyle}>
              <h3 style={{ margin: "0 0 1rem", fontSize: "1.05rem", color: "#102218" }}>
                Section 03: The Craft
              </h3>
              <div style={{ display: "grid", gap: "1rem" }}>
                <div>
                  <label style={labelStyle}>Title</label>
                  <input
                    style={inputStyle}
                    value={config.homepage.craftTitle}
                    onChange={(e) =>
                      setConfig({ ...config, homepage: { ...config.homepage, craftTitle: e.target.value } })
                    }
                  />
                </div>
                <div>
                  <label style={labelStyle}>Narrative Lead</label>
                  <textarea
                    style={textareaStyle}
                    value={config.homepage.craftLead}
                    onChange={(e) =>
                      setConfig({ ...config, homepage: { ...config.homepage, craftLead: e.target.value } })
                    }
                  />
                </div>
                <div>
                  <label style={labelStyle}>Artisan Craft Image</label>
                  <div style={{ display: "flex", gap: "0.5rem" }}>
                    <input
                      style={inputStyle}
                      value={config.homepage.craftImage}
                      onChange={(e) =>
                        setConfig({ ...config, homepage: { ...config.homepage, craftImage: e.target.value } })
                      }
                    />
                    <label
                      style={{
                        padding: "0.5rem 0.85rem",
                        background: "#f4ede0",
                        borderRadius: "6px",
                        fontSize: "0.78rem",
                        fontWeight: 600,
                        cursor: "pointer",
                        whiteSpace: "nowrap",
                        display: "flex",
                        alignItems: "center",
                        gap: "0.3rem",
                      }}
                    >
                      <Upload size={14} /> Upload
                      <input
                        type="file"
                        accept="image/*"
                        style={{ display: "none" }}
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            handleImageUpload(file, (url) => {
                              setConfig({ ...config, homepage: { ...config.homepage, craftImage: url } });
                            });
                          }
                        }}
                      />
                    </label>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Sub-section: Philosophy */}
          {homeSubTab === "philosophy" && (
            <div style={cardStyle}>
              <h3 style={{ margin: "0 0 1rem", fontSize: "1.05rem", color: "#102218" }}>
                Section 05: Brand Philosophy
              </h3>
              <div style={{ display: "grid", gap: "1rem" }}>
                <div>
                  <label style={labelStyle}>Heading</label>
                  <input
                    style={inputStyle}
                    value={config.homepage.philosophyHeading}
                    onChange={(e) =>
                      setConfig({ ...config, homepage: { ...config.homepage, philosophyHeading: e.target.value } })
                    }
                  />
                </div>
                <div>
                  <label style={labelStyle}>Core Philosophy Points</label>
                  {(config.homepage.philosophyPoints || []).map((pt, idx) => (
                    <div key={idx} style={{ display: "flex", gap: "0.5rem", marginBottom: "0.5rem" }}>
                      <textarea
                        style={{ ...textareaStyle, minHeight: "50px", flex: 1 }}
                        value={pt}
                        onChange={(e) => {
                          const next = [...config.homepage.philosophyPoints];
                          next[idx] = e.target.value;
                          setConfig({ ...config, homepage: { ...config.homepage, philosophyPoints: next } });
                        }}
                      />
                      <button
                        type="button"
                        onClick={() => {
                          const next = config.homepage.philosophyPoints.filter((_, i) => i !== idx);
                          setConfig({ ...config, homepage: { ...config.homepage, philosophyPoints: next } });
                        }}
                        style={{ background: "#fef2f2", border: "1px solid #fecaca", borderRadius: "6px", padding: "0 0.6rem", color: "#991b1b", cursor: "pointer" }}
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  ))}
                  <button
                    type="button"
                    onClick={() => {
                      const next = [...(config.homepage.philosophyPoints || []), "New philosophy statement..."];
                      setConfig({ ...config, homepage: { ...config.homepage, philosophyPoints: next } });
                    }}
                    style={{ padding: "0.4rem 0.8rem", background: "#f7f3e8", border: "1px solid #dcd4c4", borderRadius: "6px", fontSize: "0.78rem", fontWeight: 600, cursor: "pointer" }}
                  >
                    + Add Statement
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Sub-section: Founder Story */}
          {homeSubTab === "founder" && (
            <div style={cardStyle}>
              <h3 style={{ margin: "0 0 1rem", fontSize: "1.05rem", color: "#102218" }}>
                Section 06: Founder’s Story &amp; Portrait
              </h3>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "1rem" }}>
                <div>
                  <label style={labelStyle}>Founder Name</label>
                  <input
                    style={inputStyle}
                    value={config.homepage.founderName}
                    onChange={(e) =>
                      setConfig({ ...config, homepage: { ...config.homepage, founderName: e.target.value } })
                    }
                  />
                </div>
                <div>
                  <label style={labelStyle}>Founder Quote</label>
                  <input
                    style={inputStyle}
                    value={config.homepage.founderQuote}
                    onChange={(e) =>
                      setConfig({ ...config, homepage: { ...config.homepage, founderQuote: e.target.value } })
                    }
                  />
                </div>
                <div style={{ gridColumn: "1 / -1" }}>
                  <label style={labelStyle}>Founder Portrait Image</label>
                  <div style={{ display: "flex", gap: "0.5rem" }}>
                    <input
                      style={inputStyle}
                      value={config.homepage.founderImage}
                      onChange={(e) =>
                        setConfig({ ...config, homepage: { ...config.homepage, founderImage: e.target.value } })
                      }
                    />
                    <label
                      style={{
                        padding: "0.5rem 0.85rem",
                        background: "#f4ede0",
                        borderRadius: "6px",
                        fontSize: "0.78rem",
                        fontWeight: 600,
                        cursor: "pointer",
                        whiteSpace: "nowrap",
                        display: "flex",
                        alignItems: "center",
                        gap: "0.3rem",
                      }}
                    >
                      <Upload size={14} /> Upload
                      <input
                        type="file"
                        accept="image/*"
                        style={{ display: "none" }}
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            handleImageUpload(file, (url) => {
                              setConfig({ ...config, homepage: { ...config.homepage, founderImage: url } });
                            });
                          }
                        }}
                      />
                    </label>
                  </div>
                </div>
                <div style={{ gridColumn: "1 / -1" }}>
                  <label style={labelStyle}>Founder Story Lead</label>
                  <textarea
                    style={textareaStyle}
                    value={config.homepage.founderStoryLead}
                    onChange={(e) =>
                      setConfig({ ...config, homepage: { ...config.homepage, founderStoryLead: e.target.value } })
                    }
                  />
                </div>
              </div>
            </div>
          )}

          {/* Sub-section: Why Zucero */}
          {homeSubTab === "whyZucero" && (
            <div style={cardStyle}>
              <h3 style={{ margin: "0 0 1rem", fontSize: "1.05rem", color: "#102218" }}>
                Section 10: Why Zucero Exists
              </h3>
              <div style={{ display: "grid", gap: "1rem" }}>
                <div>
                  <label style={labelStyle}>Heading</label>
                  <input
                    style={inputStyle}
                    value={config.homepage.whyZuceroHeading}
                    onChange={(e) =>
                      setConfig({ ...config, homepage: { ...config.homepage, whyZuceroHeading: e.target.value } })
                    }
                  />
                </div>
                <div>
                  <label style={labelStyle}>Paragraphs</label>
                  {(config.homepage.whyZuceroParagraphs || []).map((p, idx) => (
                    <div key={idx} style={{ display: "flex", gap: "0.5rem", marginBottom: "0.5rem" }}>
                      <textarea
                        style={{ ...textareaStyle, minHeight: "50px", flex: 1 }}
                        value={p}
                        onChange={(e) => {
                          const next = [...config.homepage.whyZuceroParagraphs];
                          next[idx] = e.target.value;
                          setConfig({ ...config, homepage: { ...config.homepage, whyZuceroParagraphs: next } });
                        }}
                      />
                    </div>
                  ))}
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
                  <div>
                    <label style={labelStyle}>Highlight Banner Title</label>
                    <input
                      style={inputStyle}
                      value={config.homepage.whyZuceroBannerTitle}
                      onChange={(e) =>
                        setConfig({ ...config, homepage: { ...config.homepage, whyZuceroBannerTitle: e.target.value } })
                      }
                    />
                  </div>
                  <div>
                    <label style={labelStyle}>Highlight Banner Subtitle</label>
                    <input
                      style={inputStyle}
                      value={config.homepage.whyZuceroBannerSubtitle}
                      onChange={(e) =>
                        setConfig({ ...config, homepage: { ...config.homepage, whyZuceroBannerSubtitle: e.target.value } })
                      }
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Sub-section: Launch List */}
          {homeSubTab === "launchList" && (
            <div style={cardStyle}>
              <h3 style={{ margin: "0 0 1rem", fontSize: "1.05rem", color: "#102218" }}>
                Section 11: The Launch List
              </h3>
              <div style={{ display: "grid", gap: "1rem" }}>
                <div>
                  <label style={labelStyle}>Heading</label>
                  <input
                    style={inputStyle}
                    value={config.homepage.launchListHeading}
                    onChange={(e) =>
                      setConfig({ ...config, homepage: { ...config.homepage, launchListHeading: e.target.value } })
                    }
                  />
                </div>
                <div>
                  <label style={labelStyle}>Subtitle</label>
                  <textarea
                    style={textareaStyle}
                    value={config.homepage.launchListSubtitle}
                    onChange={(e) =>
                      setConfig({ ...config, homepage: { ...config.homepage, launchListSubtitle: e.target.value } })
                    }
                  />
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* 2. PRODUCTS TAB                                                           */}
      {/* ========================================================================= */}
      {activeTab === "products" && (
        <div style={{ display: "grid", gap: "1.25rem" }}>
          {/* Product Switcher Bar */}
          <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap", alignItems: "center" }}>
            <span style={{ fontSize: "0.82rem", fontWeight: 700, color: "#8a6616" }}>Select Product:</span>
            {config.products.map((p, idx) => (
              <button
                key={p.slug}
                type="button"
                onClick={() => {
                  setSelectedProductIdx(idx);
                  setSelectedVariantIdx(0);
                }}
                style={{
                  padding: "0.45rem 1rem",
                  borderRadius: "6px",
                  fontSize: "0.85rem",
                  fontWeight: 600,
                  cursor: "pointer",
                  border: selectedProductIdx === idx ? "2px solid #102218" : "1px solid #d4cbb8",
                  background: selectedProductIdx === idx ? "#102218" : "#fff",
                  color: selectedProductIdx === idx ? "#fff" : "#102218",
                }}
              >
                {p.name} ({p.variants.length} sizes)
              </button>
            ))}
          </div>

          {/* Product Content Card */}
          <div style={cardStyle}>
            <h3 style={{ margin: "0 0 1rem", fontSize: "1.05rem", color: "#102218" }}>
              General Information — {currentProduct.name}
            </h3>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "1rem" }}>
              <div>
                <label style={labelStyle}>Product Display Name</label>
                <input
                  style={inputStyle}
                  value={currentProduct.name}
                  onChange={(e) => updateProductField("name", e.target.value)}
                />
              </div>
              <div>
                <label style={labelStyle}>Eyebrow</label>
                <input
                  style={inputStyle}
                  value={currentProduct.eyebrow}
                  onChange={(e) => updateProductField("eyebrow", e.target.value)}
                />
              </div>
              <div style={{ gridColumn: "1 / -1" }}>
                <label style={labelStyle}>Hero Product Image URL</label>
                <div style={{ display: "flex", gap: "0.5rem" }}>
                  <input
                    style={inputStyle}
                    value={currentProduct.image}
                    onChange={(e) => updateProductField("image", e.target.value)}
                  />
                  <label
                    style={{
                      padding: "0.5rem 0.85rem",
                      background: "#f4ede0",
                      borderRadius: "6px",
                      fontSize: "0.78rem",
                      fontWeight: 600,
                      cursor: "pointer",
                      whiteSpace: "nowrap",
                      display: "flex",
                      alignItems: "center",
                      gap: "0.3rem",
                    }}
                  >
                    <Upload size={14} /> Upload
                    <input
                      type="file"
                      accept="image/*"
                      style={{ display: "none" }}
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          handleImageUpload(file, (url) => updateProductField("image", url));
                        }
                      }}
                    />
                  </label>
                </div>
              </div>
              <div style={{ gridColumn: "1 / -1" }}>
                <label style={labelStyle}>Short Description</label>
                <textarea
                  style={textareaStyle}
                  value={currentProduct.description}
                  onChange={(e) => updateProductField("description", e.target.value)}
                />
              </div>
              <div style={{ gridColumn: "1 / -1" }}>
                <label style={labelStyle}>Ingredients</label>
                <input
                  style={inputStyle}
                  value={currentProduct.ingredients}
                  onChange={(e) => updateProductField("ingredients", e.target.value)}
                />
              </div>
            </div>
          </div>

          {/* Variants & Pricing Card */}
          <div style={cardStyle}>
            <h3 style={{ margin: "0 0 0.25rem", fontSize: "1.05rem", color: "#102218" }}>
              Sizes, Prices &amp; Weights — {currentProduct.name}
            </h3>
            <p style={{ margin: "0 0 1rem", fontSize: "0.82rem", color: "#665e52" }}>
              Updating prices here updates the Product Detail Page, Shopping Cart Drawer, and Razorpay Checkout calculations.
            </p>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "1rem" }}>
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
                      Size {vIdx + 1}: {v.label}
                    </strong>
                    <button
                      type="button"
                      onClick={() => setSelectedVariantIdx(vIdx)}
                      style={{
                        padding: "0.2rem 0.5rem",
                        borderRadius: "4px",
                        fontSize: "0.72rem",
                        background: selectedVariantIdx === vIdx ? "#102218" : "#ede7d8",
                        color: selectedVariantIdx === vIdx ? "#fff" : "#102218",
                        border: "none",
                        cursor: "pointer",
                      }}
                    >
                      {selectedVariantIdx === vIdx ? "Editing Gallery" : "Select Gallery"}
                    </button>
                  </div>

                  <div style={{ display: "grid", gap: "0.6rem" }}>
                    <div>
                      <label style={labelStyle}>Size Label</label>
                      <input
                        style={inputStyle}
                        value={v.label}
                        onChange={(e) => updateVariantField(vIdx, { label: e.target.value })}
                      />
                    </div>
                    <div>
                      <label style={labelStyle}>Price in ₹ (Rupees)</label>
                      <input
                        type="number"
                        style={{ ...inputStyle, fontWeight: 700, color: "#8a6616" }}
                        value={typeof v.priceRupees === "number" ? v.priceRupees : (v.pricePaise ?? 0) / 100}
                        onChange={(e) => {
                          const rupees = parseFloat(e.target.value) || 0;
                          updateVariantField(vIdx, {
                            priceRupees: rupees,
                            pricePaise: Math.round(rupees * 100),
                          });
                        }}
                      />
                    </div>
                    <div>
                      <label style={labelStyle}>Packed Weight in Grams</label>
                      <input
                        type="number"
                        style={inputStyle}
                        value={v.packedWeightGrams || v.weightGrams || 0}
                        onChange={(e) =>
                          updateVariantField(vIdx, {
                            packedWeightGrams: parseInt(e.target.value, 10) || 0,
                            weightGrams: parseInt(e.target.value, 10) || 0,
                          })
                        }
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Product Gallery Manager */}
          <div style={cardStyle}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem", flexWrap: "wrap", gap: "0.5rem" }}>
              <div>
                <h3 style={{ margin: "0", fontSize: "1.05rem", color: "#102218" }}>
                  Product Photo Gallery — {currentProduct.name} ({currentVariant.label})
                </h3>
                <p style={{ margin: "0.2rem 0 0", fontSize: "0.82rem", color: "#665e52" }}>
                  Upload high-res photos. Reorder with Move Up / Move Down or copy across sizes.
                </p>
              </div>

              <button
                type="button"
                onClick={copyGalleryToAllVariants}
                style={{
                  padding: "0.45rem 0.85rem",
                  borderRadius: "6px",
                  fontSize: "0.78rem",
                  fontWeight: 600,
                  background: "#f4ede0",
                  border: "1px solid #dcd4c4",
                  cursor: "pointer",
                }}
              >
                Copy this gallery to all sizes
              </button>
            </div>

            {/* Upload New Photo Box */}
            <div
              style={{
                border: "2px dashed #d8b456",
                borderRadius: "8px",
                padding: "1rem",
                textAlign: "center",
                background: "#fdfbf7",
                marginBottom: "1rem",
              }}
            >
              <label style={{ cursor: "pointer", display: "inline-flex", alignItems: "center", gap: "0.5rem", fontWeight: 700, color: "#8a6616" }}>
                <Upload size={18} />
                {uploading ? "Uploading image to CDN..." : "Upload New High-Res Photo"}
                <input
                  type="file"
                  accept="image/*"
                  style={{ display: "none" }}
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleImageUpload(file, (url) => addGalleryPhoto(url));
                  }}
                />
              </label>
            </div>

            {/* Gallery Photos List */}
            <div style={{ display: "grid", gap: "0.75rem" }}>
              {(currentVariant.galleryPhotos || []).map((photo: { src: string; label: string }, pIdx: number) => (
                <div
                  key={`${pIdx}-${photo.src}`}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "1rem",
                    padding: "0.75rem",
                    borderRadius: "8px",
                    background: "#fbf9f4",
                    border: "1px solid #e6decb",
                  }}
                >
                  <img
                    src={photo.src}
                    alt={photo.label}
                    style={{ width: "60px", height: "60px", objectFit: "cover", borderRadius: "6px" }}
                  />
                  <div style={{ flex: 1 }}>
                    <input
                      style={inputStyle}
                      value={photo.label}
                      onChange={(e) => {
                        const photos = [...(currentVariant.galleryPhotos || [])];
                        photos[pIdx] = { ...photos[pIdx], label: e.target.value };
                        updateVariantField(selectedVariantIdx, { galleryPhotos: photos });
                      }}
                    />
                  </div>
                  <div style={{ display: "flex", gap: "0.3rem" }}>
                    <button
                      type="button"
                      disabled={pIdx === 0}
                      onClick={() => moveGalleryPhoto(pIdx, -1)}
                      style={{ padding: "0.4rem", borderRadius: "4px", border: "1px solid #ccc", background: "#fff", cursor: "pointer" }}
                    >
                      <ArrowUp size={14} />
                    </button>
                    <button
                      type="button"
                      disabled={pIdx === (currentVariant.galleryPhotos || []).length - 1}
                      onClick={() => moveGalleryPhoto(pIdx, 1)}
                      style={{ padding: "0.4rem", borderRadius: "4px", border: "1px solid #ccc", background: "#fff", cursor: "pointer" }}
                    >
                      <ArrowDown size={14} />
                    </button>
                    <button
                      type="button"
                      onClick={() => removeGalleryPhoto(pIdx)}
                      style={{ padding: "0.4rem", borderRadius: "4px", border: "1px solid #fecaca", background: "#fef2f2", color: "#991b1b", cursor: "pointer" }}
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 3. OUR STORY TAB                                                          */}
      {/* ========================================================================= */}
      {activeTab === "ourStory" && (
        <div style={cardStyle}>
          <h3 style={{ margin: "0 0 1rem", fontSize: "1.05rem", color: "#102218" }}>
            Our Story Page (`/our-story`)
          </h3>
          <div style={{ display: "grid", gap: "1rem" }}>
            <div>
              <label style={labelStyle}>Page Eyebrow</label>
              <input
                style={inputStyle}
                value={config.ourStory.eyebrow}
                onChange={(e) =>
                  setConfig({ ...config, ourStory: { ...config.ourStory, eyebrow: e.target.value } })
                }
              />
            </div>
            <div>
              <label style={labelStyle}>Headline / Title</label>
              <input
                style={inputStyle}
                value={config.ourStory.title}
                onChange={(e) =>
                  setConfig({ ...config, ourStory: { ...config.ourStory, title: e.target.value } })
                }
              />
            </div>
            <div>
              <label style={labelStyle}>Intro Lead Paragraph</label>
              <textarea
                style={textareaStyle}
                value={config.ourStory.intro}
                onChange={(e) =>
                  setConfig({ ...config, ourStory: { ...config.ourStory, intro: e.target.value } })
                }
              />
            </div>
            <div>
              <label style={labelStyle}>Story Paragraphs</label>
              {(config.ourStory.storyParagraphs || []).map((p, idx) => (
                <div key={idx} style={{ display: "flex", gap: "0.5rem", marginBottom: "0.5rem" }}>
                  <textarea
                    style={{ ...textareaStyle, minHeight: "50px", flex: 1 }}
                    value={p}
                    onChange={(e) => {
                      const next = [...config.ourStory.storyParagraphs];
                      next[idx] = e.target.value;
                      setConfig({ ...config, ourStory: { ...config.ourStory, storyParagraphs: next } });
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => {
                      const next = config.ourStory.storyParagraphs.filter((_, i) => i !== idx);
                      setConfig({ ...config, ourStory: { ...config.ourStory, storyParagraphs: next } });
                    }}
                    style={{ background: "#fef2f2", border: "1px solid #fecaca", borderRadius: "6px", padding: "0 0.6rem", color: "#991b1b", cursor: "pointer" }}
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
              <button
                type="button"
                onClick={() => {
                  const next = [...(config.ourStory.storyParagraphs || []), "New story paragraph..."];
                  setConfig({ ...config, ourStory: { ...config.ourStory, storyParagraphs: next } });
                }}
                style={{ padding: "0.4rem 0.8rem", background: "#f7f3e8", border: "1px solid #dcd4c4", borderRadius: "6px", fontSize: "0.78rem", fontWeight: 600, cursor: "pointer" }}
              >
                + Add Paragraph
              </button>
            </div>
            <div>
              <label style={labelStyle}>Compliance / Health Note</label>
              <textarea
                style={textareaStyle}
                value={config.ourStory.disclaimer}
                onChange={(e) =>
                  setConfig({ ...config, ourStory: { ...config.ourStory, disclaimer: e.target.value } })
                }
              />
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 4. CONTACT TAB                                                            */}
      {/* ========================================================================= */}
      {activeTab === "contact" && (
        <div style={cardStyle}>
          <h3 style={{ margin: "0 0 1rem", fontSize: "1.05rem", color: "#102218" }}>
            Contact Page (`/contact`) &amp; Support Info
          </h3>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "1rem" }}>
            <div>
              <label style={labelStyle}>Support Email</label>
              <input
                style={inputStyle}
                value={config.contact.supportEmail}
                onChange={(e) =>
                  setConfig({ ...config, contact: { ...config.contact, supportEmail: e.target.value } })
                }
              />
            </div>
            <div>
              <label style={labelStyle}>Support WhatsApp Phone</label>
              <input
                style={inputStyle}
                value={config.contact.whatsappPhone}
                onChange={(e) =>
                  setConfig({ ...config, contact: { ...config.contact, whatsappPhone: e.target.value } })
                }
              />
            </div>
            <div>
              <label style={labelStyle}>Response Time Notice</label>
              <input
                style={inputStyle}
                value={config.contact.responseNote || ""}
                onChange={(e) =>
                  setConfig({ ...config, contact: { ...config.contact, responseNote: e.target.value } })
                }
              />
            </div>
            <div>
              <label style={labelStyle}>Operating Hours</label>
              <input
                style={inputStyle}
                value={config.contact.supportHours || ""}
                onChange={(e) =>
                  setConfig({ ...config, contact: { ...config.contact, supportHours: e.target.value } })
                }
              />
            </div>
            <div style={{ gridColumn: "1 / -1" }}>
              <label style={labelStyle}>Registered Office Address</label>
              <input
                style={inputStyle}
                value={config.contact.officeAddress || ""}
                onChange={(e) =>
                  setConfig({ ...config, contact: { ...config.contact, officeAddress: e.target.value } })
                }
              />
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 5. LEGAL & POLICIES TAB                                                   */}
      {/* ========================================================================= */}
      {activeTab === "policies" && (
        <div style={{ display: "grid", gap: "1.25rem" }}>
          {/* Sub Navigation */}
          <div style={{ display: "flex", gap: "0.4rem", flexWrap: "wrap" }}>
            {[
              { id: "shipping", label: "Shipping Policy" },
              { id: "returns", label: "Returns Policy" },
              { id: "refunds", label: "Refunds Policy" },
              { id: "privacy", label: "Privacy Policy" },
              { id: "terms", label: "Terms of Service" },
            ].map((sub) => (
              <button
                key={sub.id}
                type="button"
                onClick={() => setPolicySubTab(sub.id as PolicySubTab)}
                style={sectionSubNavBtnStyle(policySubTab === sub.id)}
              >
                {sub.label}
              </button>
            ))}
          </div>

          {/* Current Policy Editor */}
          {(() => {
            const currentPolicy = config.policies[policySubTab];
            const updatePolicy = (patch: Partial<typeof currentPolicy>) => {
              setConfig({
                ...config,
                policies: {
                  ...config.policies,
                  [policySubTab]: { ...currentPolicy, ...patch },
                },
              });
            };

            return (
              <div style={cardStyle}>
                <h3 style={{ margin: "0 0 1rem", fontSize: "1.05rem", color: "#102218" }}>
                  Editing: {currentPolicy.title} (`/{policySubTab}`)
                </h3>
                <div style={{ display: "grid", gap: "1rem" }}>
                  <div>
                    <label style={labelStyle}>Eyebrow</label>
                    <input
                      style={inputStyle}
                      value={currentPolicy.eyebrow}
                      onChange={(e) => updatePolicy({ eyebrow: e.target.value })}
                    />
                  </div>
                  <div>
                    <label style={labelStyle}>Page Title</label>
                    <input
                      style={inputStyle}
                      value={currentPolicy.title}
                      onChange={(e) => updatePolicy({ title: e.target.value })}
                    />
                  </div>
                  <div>
                    <label style={labelStyle}>Intro Summary</label>
                    <textarea
                      style={textareaStyle}
                      value={currentPolicy.intro}
                      onChange={(e) => updatePolicy({ intro: e.target.value })}
                    />
                  </div>
                  <div>
                    <label style={labelStyle}>Policy Clauses &amp; Sections</label>
                    <div style={{ display: "grid", gap: "0.85rem" }}>
                      {(currentPolicy.sections || []).map((sec, idx) => (
                        <div key={idx} style={{ background: "#fbf9f4", padding: "1rem", borderRadius: "8px", border: "1px solid #e2dac9" }}>
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.4rem" }}>
                            <span style={{ fontSize: "0.78rem", fontWeight: 700, color: "#8a6616" }}>Clause {idx + 1}</span>
                            <button
                              type="button"
                              onClick={() => {
                                const nextSecs = currentPolicy.sections.filter((_, i) => i !== idx);
                                updatePolicy({ sections: nextSecs });
                              }}
                              style={{ background: "#fef2f2", border: "1px solid #fecaca", borderRadius: "4px", padding: "0.2rem 0.5rem", color: "#991b1b", fontSize: "0.72rem", cursor: "pointer" }}
                            >
                              Remove Clause
                            </button>
                          </div>
                          <div style={{ marginBottom: "0.5rem" }}>
                            <label style={{ ...labelStyle, fontSize: "0.72rem" }}>Clause Heading</label>
                            <input
                              style={inputStyle}
                              value={sec.heading}
                              onChange={(e) => {
                                const nextSecs = [...currentPolicy.sections];
                                nextSecs[idx] = { ...nextSecs[idx], heading: e.target.value };
                                updatePolicy({ sections: nextSecs });
                              }}
                            />
                          </div>
                          <div>
                            <label style={{ ...labelStyle, fontSize: "0.72rem" }}>Clause Content</label>
                            <textarea
                              style={textareaStyle}
                              value={sec.content}
                              onChange={(e) => {
                                const nextSecs = [...currentPolicy.sections];
                                nextSecs[idx] = { ...nextSecs[idx], content: e.target.value };
                                updatePolicy({ sections: nextSecs });
                              }}
                            />
                          </div>
                        </div>
                      ))}
                      <button
                        type="button"
                        onClick={() => {
                          const nextSecs = [...(currentPolicy.sections || []), { heading: "New Clause Heading", content: "New clause explanation..." }];
                          updatePolicy({ sections: nextSecs });
                        }}
                        style={{ alignSelf: "start", padding: "0.45rem 0.9rem", background: "#f7f3e8", border: "1px solid #dcd4c4", borderRadius: "6px", fontSize: "0.8rem", fontWeight: 600, cursor: "pointer" }}
                      >
                        + Add Policy Clause
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })()}
        </div>
      )}

      {/* ========================================================================= */}
      {/* 6. GUIDES TAB                                                             */}
      {/* ========================================================================= */}
      {activeTab === "guides" && (
        <div style={{ display: "grid", gap: "1.25rem" }}>
          {/* Sub Navigation */}
          <div style={{ display: "flex", gap: "0.4rem" }}>
            <button
              type="button"
              onClick={() => setGuideSubTab("desiKhand")}
              style={sectionSubNavBtnStyle(guideSubTab === "desiKhand")}
            >
              Desi Khand Guide
            </button>
            <button
              type="button"
              onClick={() => setGuideSubTab("sugarAlternatives")}
              style={sectionSubNavBtnStyle(guideSubTab === "sugarAlternatives")}
            >
              Sugar Alternatives Guide
            </button>
          </div>

          {/* Guide Editor */}
          {(() => {
            const currentGuide = config.guides[guideSubTab];
            const updateGuide = (patch: Partial<typeof currentGuide>) => {
              setConfig({
                ...config,
                guides: {
                  ...config.guides,
                  [guideSubTab]: { ...currentGuide, ...patch },
                },
              });
            };

            return (
              <div style={cardStyle}>
                <h3 style={{ margin: "0 0 1rem", fontSize: "1.05rem", color: "#102218" }}>
                  Editing: {currentGuide.title}
                </h3>
                <div style={{ display: "grid", gap: "1rem" }}>
                  <div>
                    <label style={labelStyle}>Eyebrow</label>
                    <input
                      style={inputStyle}
                      value={currentGuide.eyebrow}
                      onChange={(e) => updateGuide({ eyebrow: e.target.value })}
                    />
                  </div>
                  <div>
                    <label style={labelStyle}>Page Title</label>
                    <input
                      style={inputStyle}
                      value={currentGuide.title}
                      onChange={(e) => updateGuide({ title: e.target.value })}
                    />
                  </div>
                  <div>
                    <label style={labelStyle}>Intro</label>
                    <textarea
                      style={textareaStyle}
                      value={currentGuide.intro}
                      onChange={(e) => updateGuide({ intro: e.target.value })}
                    />
                  </div>
                  <div>
                    <label style={labelStyle}>Frequently Asked Questions</label>
                    <div style={{ display: "grid", gap: "0.75rem" }}>
                      {(currentGuide.faqs || []).map((faq, idx) => (
                        <div key={idx} style={{ background: "#fbf9f4", padding: "0.85rem", borderRadius: "8px", border: "1px solid #e2dac9" }}>
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.3rem" }}>
                            <span style={{ fontSize: "0.75rem", fontWeight: 700, color: "#8a6616" }}>FAQ 0{idx + 1}</span>
                            <button
                              type="button"
                              onClick={() => {
                                const next = currentGuide.faqs.filter((_, i) => i !== idx);
                                updateGuide({ faqs: next });
                              }}
                              style={{ background: "#fef2f2", border: "1px solid #fecaca", borderRadius: "4px", padding: "0.2rem 0.5rem", color: "#991b1b", fontSize: "0.72rem", cursor: "pointer" }}
                            >
                              Remove
                            </button>
                          </div>
                          <div style={{ marginBottom: "0.4rem" }}>
                            <label style={{ ...labelStyle, fontSize: "0.7rem" }}>Question</label>
                            <input
                              style={inputStyle}
                              value={faq.question}
                              onChange={(e) => {
                                const next = [...currentGuide.faqs];
                                next[idx] = { ...next[idx], question: e.target.value };
                                updateGuide({ faqs: next });
                              }}
                            />
                          </div>
                          <div>
                            <label style={{ ...labelStyle, fontSize: "0.7rem" }}>Answer</label>
                            <textarea
                              style={textareaStyle}
                              value={faq.answer}
                              onChange={(e) => {
                                const next = [...currentGuide.faqs];
                                next[idx] = { ...next[idx], answer: e.target.value };
                                updateGuide({ faqs: next });
                              }}
                            />
                          </div>
                        </div>
                      ))}
                      <button
                        type="button"
                        onClick={() => {
                          const next = [...(currentGuide.faqs || []), { question: "New Question?", answer: "Answer..." }];
                          updateGuide({ faqs: next });
                        }}
                        style={{ alignSelf: "start", padding: "0.4rem 0.8rem", background: "#f7f3e8", border: "1px solid #dcd4c4", borderRadius: "6px", fontSize: "0.78rem", fontWeight: 600, cursor: "pointer" }}
                      >
                        + Add FAQ
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })()}
        </div>
      )}

      {/* ========================================================================= */}
      {/* 7. HEADER & FOOTER TAB                                                    */}
      {/* ========================================================================= */}
      {activeTab === "headerFooter" && (
        <div style={{ display: "grid", gap: "1.25rem" }}>
          {/* Header Announcement Bar */}
          <div style={cardStyle}>
            <h3 style={{ margin: "0 0 1rem", fontSize: "1.05rem", color: "#102218" }}>
              Top Announcement Bar (Site Header)
            </h3>
            <div style={{ display: "grid", gap: "1rem" }}>
              <label style={{ display: "flex", alignItems: "center", gap: "0.5rem", cursor: "pointer", fontSize: "0.88rem", fontWeight: 600 }}>
                <input
                  type="checkbox"
                  checked={config.header?.announcementEnabled}
                  onChange={(e) =>
                    setConfig({
                      ...config,
                      header: { ...config.header, announcementEnabled: e.target.checked },
                    })
                  }
                />
                Enable Top Announcement Bar on Live Storefront
              </label>
              <div>
                <label style={labelStyle}>Announcement Text</label>
                <input
                  style={inputStyle}
                  value={config.header?.announcementText || ""}
                  onChange={(e) =>
                    setConfig({
                      ...config,
                      header: { ...config.header, announcementText: e.target.value },
                    })
                  }
                />
              </div>
              <div>
                <label style={labelStyle}>Announcement Link URL</label>
                <input
                  style={inputStyle}
                  value={config.header?.announcementLink || "/products"}
                  onChange={(e) =>
                    setConfig({
                      ...config,
                      header: { ...config.header, announcementLink: e.target.value },
                    })
                  }
                />
              </div>
            </div>
          </div>

          {/* Footer & Compliance */}
          <div style={cardStyle}>
            <h3 style={{ margin: "0 0 1rem", fontSize: "1.05rem", color: "#102218" }}>
              Footer Information &amp; Legal Compliance
            </h3>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "1rem" }}>
              <div style={{ gridColumn: "1 / -1" }}>
                <label style={labelStyle}>Brand Tagline</label>
                <input
                  style={inputStyle}
                  value={config.footer?.tagline}
                  onChange={(e) =>
                    setConfig({
                      ...config,
                      footer: { ...config.footer, tagline: e.target.value },
                    })
                  }
                />
              </div>
              <div>
                <label style={labelStyle}>FSSAI Licence Number</label>
                <input
                  style={inputStyle}
                  value={config.footer?.fssaiNumber}
                  onChange={(e) =>
                    setConfig({
                      ...config,
                      footer: { ...config.footer, fssaiNumber: e.target.value },
                    })
                  }
                />
              </div>
              <div>
                <label style={labelStyle}>CIN Number</label>
                <input
                  style={inputStyle}
                  value={config.footer?.cinNumber}
                  onChange={(e) =>
                    setConfig({
                      ...config,
                      footer: { ...config.footer, cinNumber: e.target.value },
                    })
                  }
                />
              </div>
              <div>
                <label style={labelStyle}>Registered Company Name</label>
                <input
                  style={inputStyle}
                  value={config.footer?.companyName}
                  onChange={(e) =>
                    setConfig({
                      ...config,
                      footer: { ...config.footer, companyName: e.target.value },
                    })
                  }
                />
              </div>
              <div>
                <label style={labelStyle}>Registered Office Address</label>
                <input
                  style={inputStyle}
                  value={config.footer?.registeredOffice}
                  onChange={(e) =>
                    setConfig({
                      ...config,
                      footer: { ...config.footer, registeredOffice: e.target.value },
                    })
                  }
                />
              </div>
            </div>
          </div>

          {/* Social Links */}
          <div style={cardStyle}>
            <h3 style={{ margin: "0 0 1rem", fontSize: "1.05rem", color: "#102218" }}>
              Social Media Handles (Footer Icons)
            </h3>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "1rem" }}>
              <div>
                <label style={labelStyle}>Instagram Profile URL</label>
                <input
                  style={inputStyle}
                  value={config.contact?.instagramUrl || ""}
                  onChange={(e) =>
                    setConfig({ ...config, contact: { ...config.contact, instagramUrl: e.target.value } })
                  }
                />
              </div>
              <div>
                <label style={labelStyle}>YouTube Channel URL</label>
                <input
                  style={inputStyle}
                  value={config.contact?.youtubeUrl || ""}
                  onChange={(e) =>
                    setConfig({ ...config, contact: { ...config.contact, youtubeUrl: e.target.value } })
                  }
                />
              </div>
              <div>
                <label style={labelStyle}>Twitter / X Profile URL</label>
                <input
                  style={inputStyle}
                  value={config.contact?.twitterUrl || ""}
                  onChange={(e) =>
                    setConfig({ ...config, contact: { ...config.contact, twitterUrl: e.target.value } })
                  }
                />
              </div>
              <div>
                <label style={labelStyle}>LinkedIn Company URL</label>
                <input
                  style={inputStyle}
                  value={config.contact?.linkedinUrl || ""}
                  onChange={(e) =>
                    setConfig({ ...config, contact: { ...config.contact, linkedinUrl: e.target.value } })
                  }
                />
              </div>
              <div>
                <label style={labelStyle}>Facebook Page URL</label>
                <input
                  style={inputStyle}
                  value={config.contact?.facebookUrl || ""}
                  onChange={(e) =>
                    setConfig({ ...config, contact: { ...config.contact, facebookUrl: e.target.value } })
                  }
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 8. PROMOTIONS TAB                                                         */}
      {/* ========================================================================= */}
      {activeTab === "promotions" && (
        <div style={cardStyle}>
          <h3 style={{ margin: "0 0 1rem", fontSize: "1.05rem", color: "#102218" }}>
            Promotions &amp; Offer Badges
          </h3>
          <div style={{ display: "grid", gap: "1rem" }}>
            <div>
              <label style={labelStyle}>Introductory Price Notice (Shown Next to Prices)</label>
              <input
                style={inputStyle}
                value={config.promotions.introductoryPriceText}
                onChange={(e) =>
                  setConfig({
                    ...config,
                    promotions: { ...config.promotions, introductoryPriceText: e.target.value },
                  })
                }
              />
            </div>
            <div>
              <label style={labelStyle}>Referral Offer Line</label>
              <input
                style={inputStyle}
                value={config.promotions.referralOfferText}
                onChange={(e) =>
                  setConfig({
                    ...config,
                    promotions: { ...config.promotions, referralOfferText: e.target.value },
                  })
                }
              />
            </div>
            <div style={{ borderTop: "1px solid #e6decb", paddingTop: "1rem", marginTop: "0.5rem" }}>
              <label style={{ display: "flex", alignItems: "center", gap: "0.5rem", cursor: "pointer", fontSize: "0.88rem", fontWeight: 600, marginBottom: "1rem" }}>
                <input
                  type="checkbox"
                  checked={config.promotions.popupEnabled !== false}
                  onChange={(e) =>
                    setConfig({
                      ...config,
                      promotions: { ...config.promotions, popupEnabled: e.target.checked },
                    })
                  }
                />
                Enable Floating Referral Offer Popup on Site
              </label>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
                <div>
                  <label style={labelStyle}>Popup Heading</label>
                  <input
                    style={inputStyle}
                    value={config.promotions.popupHeading}
                    onChange={(e) =>
                      setConfig({
                        ...config,
                        promotions: { ...config.promotions, popupHeading: e.target.value },
                      })
                    }
                  />
                </div>
                <div>
                  <label style={labelStyle}>Popup Description</label>
                  <input
                    style={inputStyle}
                    value={config.promotions.popupDescription}
                    onChange={(e) =>
                      setConfig({
                        ...config,
                        promotions: { ...config.promotions, popupDescription: e.target.value },
                      })
                    }
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 9. RAW JSON TAB                                                           */}
      {/* ========================================================================= */}
      {activeTab === "rawJson" && (
        <div style={cardStyle}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.75rem" }}>
            <div>
              <h3 style={{ margin: "0", fontSize: "1.05rem", color: "#102218" }}>
                Advanced Direct Raw JSON Schema Editor
              </h3>
              <p style={{ margin: "0.2rem 0 0", fontSize: "0.82rem", color: "#665e52" }}>
                Full unrestricted access to edit any key, value, or array on the entire website.
              </p>
            </div>
            <button
              type="button"
              onClick={formatRawJson}
              style={{
                padding: "0.45rem 0.85rem",
                borderRadius: "6px",
                background: "#f4ede0",
                border: "1px solid #dcd4c4",
                fontSize: "0.78rem",
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              Format JSON
            </button>
          </div>

          {rawJsonError && (
            <div style={{ padding: "0.6rem 0.85rem", background: "#fef2f2", border: "1px solid #fecaca", borderRadius: "6px", color: "#991b1b", fontSize: "0.8rem", marginBottom: "0.75rem", display: "flex", alignItems: "center", gap: "0.4rem" }}>
              <AlertCircle size={15} />
              JSON Error: {rawJsonError}
            </div>
          )}

          <textarea
            style={{
              ...textareaStyle,
              minHeight: "450px",
              fontFamily: "monospace",
              fontSize: "0.82rem",
              background: "#1e1e1e",
              color: "#d4d4d4",
              border: rawJsonError ? "2px solid #ef4444" : "1px solid #333",
            }}
            value={rawJsonString}
            onChange={(e) => handleRawJsonChange(e.target.value)}
          />
        </div>
      )}

      {/* ========================================================================= */}
      {/* 10. COMMITS & ROLLBACK TAB                                                */}
      {/* ========================================================================= */}
      {activeTab === "commits" && (
        <div style={cardStyle}>
          <h3 style={{ margin: "0 0 0.5rem", fontSize: "1.05rem", color: "#102218" }}>
            Commit History &amp; 1-Click Rollback
          </h3>
          <p style={{ margin: "0 0 1rem", fontSize: "0.82rem", color: "#665e52" }}>
            Every time you click Save &amp; Commit, a complete snapshot of the website is archived. You can rollback to any previous version anytime.
          </p>

          {commits.length === 0 ? (
            <p style={{ fontSize: "0.85rem", color: "#777" }}>No commits found yet.</p>
          ) : (
            <div style={{ display: "grid", gap: "0.75rem" }}>
              {commits.map((c) => (
                <div
                  key={c.id}
                  style={{
                    padding: "0.85rem",
                    borderRadius: "8px",
                    background: "#fbf9f4",
                    border: "1px solid #e6decb",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    flexWrap: "wrap",
                    gap: "0.75rem",
                  }}
                >
                  <div>
                    <strong style={{ fontSize: "0.9rem", color: "#102218" }}>{c.message}</strong>
                    <div style={{ fontSize: "0.76rem", color: "#665e52", marginTop: "0.2rem" }}>
                      Author: {c.author} · Time: {new Date(c.timestamp).toLocaleString()}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleRollback(c.id)}
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "0.3rem",
                      padding: "0.4rem 0.85rem",
                      borderRadius: "6px",
                      background: "#102218",
                      color: "#fff",
                      border: "none",
                      fontSize: "0.78rem",
                      fontWeight: 600,
                      cursor: "pointer",
                    }}
                  >
                    <RotateCcw size={13} /> Rollback to this version
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
