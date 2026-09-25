"use client";

import type { CMSLayoutSizing } from "@/lib/cms";

export function AdminLayoutSizingManager({
  value,
  onChange,
}: {
  value: CMSLayoutSizing;
  onChange: (next: CMSLayoutSizing) => void;
}) {
  const patch = (key: keyof CMSLayoutSizing, raw: string) => {
    const parsed = Math.max(0, Number(raw) || 0);
    onChange({ ...value, [key]: parsed });
  };

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

  const fields: Array<[keyof CMSLayoutSizing, string, string]> = [
    ["sectionPaddingYPx", "Default Section Vertical Padding", "Applies top/bottom spacing to most site sections."],
    ["sectionPaddingXPx", "Default Section Side Padding", "Applies left/right spacing to most site sections."],
    ["contentMaxWidthPx", "Default Content Max Width", "Constrains text/content areas site-wide."],
    ["cardPaddingPx", "Card Inner Padding", "Changes internal spacing of cards and callout boxes."],
    ["cardRadiusPx", "Card Corner Radius", "Rounds cards and image cards. Use 0 to preserve theme."],
    ["cardGapPx", "Grid / Card Gap", "Controls spacing between cards in common card grids."],
    ["cardMinWidthPx", "Minimum Card Width", "Controls how wide cards should be before the grid wraps."],
    ["cardImageHeightPx", "Card Image Height", "Overrides common card/media image height."],
    ["carouselCardWidthPx", "Story Carousel Card Width", "Controls the width of each GOOD IS carousel card."],
    ["carouselCardHeightPx", "Story Carousel Card Height", "Controls the height of each GOOD IS carousel card."],
  ];

  return (
    <div style={{ display: "grid", gap: "1rem" }}>
      <div style={{ background: "#fffdf7", border: "1px solid #d8b456", borderRadius: "10px", padding: "1rem" }}>
        <h3 style={{ margin: "0 0 0.35rem", color: "#102218" }}>Global Layout &amp; Card Sizing</h3>
        <p style={{ margin: "0 0 1rem", fontSize: "0.82rem", color: "#665e52", lineHeight: 1.55 }}>
          These are universal size controls. Enter <strong>0</strong> to keep the current responsive design. Any positive value overrides the default size in pixels.
        </p>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(230px,1fr))", gap: "0.9rem" }}>
          {fields.map(([key, label, help]) => (
            <label key={key} style={labelStyle}>
              {label} (px)
              <input
                type="number"
                min={0}
                max={2000}
                value={value[key]}
                onChange={(e) => patch(key, e.target.value)}
                style={inputStyle}
              />
              <span style={{ textTransform: "none", letterSpacing: 0, fontWeight: 400, color: "#776e61", fontSize: "0.72rem", lineHeight: 1.4 }}>
                {help}
              </span>
            </label>
          ))}
        </div>
      </div>

      <div style={{ padding: "0.9rem 1rem", background: "#f4f7f5", borderRadius: "8px", border: "1px solid #d8e4dd", color: "#355143", fontSize: "0.8rem", lineHeight: 1.55 }}>
        <strong>Per-section overrides:</strong> each editable section also has its own width, height, padding and image-height controls. Those section-level values take priority for that section while these settings act as the global baseline.
      </div>
    </div>
  );
}
