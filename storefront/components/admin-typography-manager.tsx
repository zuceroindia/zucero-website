"use client";

import { useMemo, useState } from "react";
import { Trash2, Type, Upload } from "lucide-react";
import type { CMSTypography, CMSUploadedFont } from "@/lib/cms";

export function AdminTypographyManager({
  typography,
  onChange,
}: {
  typography: CMSTypography;
  onChange: (next: CMSTypography) => void;
}) {
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState("");

  const fontOptions = useMemo(() => {
    const builtIns = ["Manrope", "Cormorant Garamond", "Melodrama", "Georgia", "Arial", "Helvetica Neue"];
    return Array.from(new Set([...builtIns, ...(typography.uploadedFonts || []).map((font) => font.name)]));
  }, [typography.uploadedFonts]);

  function patch(next: Partial<CMSTypography>) {
    onChange({ ...typography, ...next });
  }

  async function uploadFont(file: File) {
    setUploading(true);
    setMessage("");
    try {
      const formData = new FormData();
      formData.append("file", file);
      const response = await fetch("/api/admin/cms/font-upload", { method: "POST", body: formData });
      const data = await response.json();
      if (!response.ok || !data.publicUrl) {
        throw new Error(data.error || "Font upload failed.");
      }

      const font: CMSUploadedFont = {
        id: `font_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
        name: data.name || file.name.replace(/\.[^.]+$/, ""),
        url: data.publicUrl,
        format: data.format,
      };
      patch({ uploadedFonts: [...(typography.uploadedFonts || []), font] });
      setMessage(`${font.name} uploaded. Select it below, then Save & Commit to publish.`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Font upload failed.");
    } finally {
      setUploading(false);
    }
  }

  function removeFont(id: string) {
    const font = typography.uploadedFonts.find((item) => item.id === id);
    const remaining = typography.uploadedFonts.filter((item) => item.id !== id);
    patch({
      uploadedFonts: remaining,
      bodyFont: font && typography.bodyFont === font.name ? "Manrope" : typography.bodyFont,
      headingFont: font && typography.headingFont === font.name ? "Cormorant Garamond" : typography.headingFont,
      accentFont: font && typography.accentFont === font.name ? "Manrope" : typography.accentFont,
    });
  }

  const inputStyle = {
    width: "100%",
    padding: "0.55rem 0.75rem",
    borderRadius: "6px",
    border: "1px solid #dcd4c4",
    background: "#fff",
    fontSize: "0.86rem",
    boxSizing: "border-box" as const,
  };
  const labelStyle = {
    display: "grid",
    gap: "0.32rem",
    fontSize: "0.73rem",
    fontWeight: 700,
    color: "#4a4235",
    textTransform: "uppercase" as const,
    letterSpacing: "0.04em",
  };

  return (
    <div style={{ display: "grid", gap: "1.1rem" }}>
      <div style={{ background: "#fffdf7", border: "1px solid #d8b456", borderRadius: "10px", padding: "1rem" }}>
        <h3 style={{ margin: "0 0 0.35rem", color: "#102218", display: "flex", alignItems: "center", gap: "0.4rem" }}>
          <Type size={18} /> Website Typography
        </h3>
        <p style={{ margin: "0 0 1rem", fontSize: "0.82rem", color: "#665e52" }}>
          Change the global body, heading and accent fonts. Upload your own font files below, then select the uploaded family.
        </p>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(210px,1fr))", gap: "0.8rem" }}>
          <label style={labelStyle}>
            Body font
            <select style={inputStyle} value={typography.bodyFont} onChange={(e) => patch({ bodyFont: e.target.value })}>
              {fontOptions.map((font) => <option key={font}>{font}</option>)}
            </select>
          </label>
          <label style={labelStyle}>
            Heading font
            <select style={inputStyle} value={typography.headingFont} onChange={(e) => patch({ headingFont: e.target.value })}>
              {fontOptions.map((font) => <option key={font}>{font}</option>)}
            </select>
          </label>
          <label style={labelStyle}>
            Accent / buttons / nav font
            <select style={inputStyle} value={typography.accentFont} onChange={(e) => patch({ accentFont: e.target.value })}>
              {fontOptions.map((font) => <option key={font}>{font}</option>)}
            </select>
          </label>
          <label style={labelStyle}>
            Body weight
            <select style={inputStyle} value={typography.bodyWeight} onChange={(e) => patch({ bodyWeight: Number(e.target.value) })}>
              {[300,400,500,600,700].map((weight) => <option key={weight} value={weight}>{weight}</option>)}
            </select>
          </label>
          <label style={labelStyle}>
            Heading weight
            <select style={inputStyle} value={typography.headingWeight} onChange={(e) => patch({ headingWeight: Number(e.target.value) })}>
              {[300,400,500,600,700].map((weight) => <option key={weight} value={weight}>{weight}</option>)}
            </select>
          </label>
        </div>

        <label
          style={{
            marginTop: "1rem",
            border: "2px dashed #d8b456",
            borderRadius: "8px",
            minHeight: "82px",
            display: "grid",
            placeItems: "center",
            color: "#8a6616",
            fontWeight: 700,
            cursor: "pointer",
            background: "#fff",
          }}
        >
          <span style={{ display: "inline-flex", alignItems: "center", gap: "0.45rem" }}>
            <Upload size={16} /> {uploading ? "Uploading font…" : "Upload Custom Font (.woff2, .woff, .ttf, .otf)"}
          </span>
          <input
            type="file"
            accept=".woff2,.woff,.ttf,.otf,font/woff2,font/woff,font/ttf,font/otf"
            style={{ display: "none" }}
            disabled={uploading}
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) void uploadFont(file);
              e.currentTarget.value = "";
            }}
          />
        </label>
        {message && <p style={{ margin: "0.65rem 0 0", fontSize: "0.8rem", color: "#166534" }}>{message}</p>}

        {(typography.uploadedFonts || []).length > 0 && (
          <div style={{ display: "grid", gap: "0.45rem", marginTop: "0.9rem" }}>
            {typography.uploadedFonts.map((font) => (
              <div key={font.id} style={{ display: "flex", justifyContent: "space-between", gap: "0.75rem", alignItems: "center", padding: "0.55rem 0.7rem", border: "1px solid #e6decb", borderRadius: "6px", background: "#fff" }}>
                <span style={{ fontFamily: `"${font.name}", sans-serif`, fontSize: "0.95rem" }}>{font.name}</span>
                <button type="button" onClick={() => removeFont(font.id)} style={{ border: "1px solid #fecaca", background: "#fef2f2", color: "#991b1b", borderRadius: "5px", padding: "0.35rem", cursor: "pointer" }}>
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      <div style={{ background: "#fff", border: "1px solid #e6decb", borderRadius: "10px", padding: "1rem" }}>
        <h3 style={{ margin: "0 0 0.35rem", color: "#102218" }}>Font Sizes</h3>
        <p style={{ margin: "0 0 1rem", fontSize: "0.8rem", color: "#665e52" }}>
          Enter 0 to keep the current responsive theme size. Any positive value applies that size in pixels site-wide.
        </p>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(150px,1fr))", gap: "0.8rem" }}>
          {[
            ["Body", "bodySizePx"],
            ["H1 / Page titles", "h1SizePx"],
            ["H2 / Section titles", "h2SizePx"],
            ["H3 / Card titles", "h3SizePx"],
            ["Navigation", "navSizePx"],
            ["Buttons / links", "buttonSizePx"],
          ].map(([label, key]) => (
            <label key={key} style={labelStyle}>
              {label} (px)
              <input
                style={inputStyle}
                type="number"
                min={0}
                max={180}
                value={typography[key as keyof CMSTypography] as number}
                onChange={(e) => patch({ [key]: Math.max(0, Number(e.target.value) || 0) } as Partial<CMSTypography>)}
              />
            </label>
          ))}
        </div>
      </div>

      <div style={{ background: "#fff", border: "1px solid #e6decb", borderRadius: "10px", padding: "1rem" }}>
        <h3 style={{ margin: "0 0 0.35rem", color: "#102218" }}>Advanced Typography Override</h3>
        <p style={{ margin: "0 0 0.7rem", fontSize: "0.8rem", color: "#665e52" }}>
          Optional. Use CSS selectors to change typography in a specific part of the website without changing everything else. Example: <code>.product-info h3{"{font-size:36px;}"}</code>
        </p>
        <textarea
          style={{ ...inputStyle, minHeight: "150px", fontFamily: "monospace" }}
          value={typography.advancedCss || ""}
          placeholder={'.hero h1 { font-size: 88px; }\n.product-info h3 { font-family: "Your Font"; }'}
          onChange={(e) => patch({ advancedCss: e.target.value })}
        />
      </div>
    </div>
  );
}
