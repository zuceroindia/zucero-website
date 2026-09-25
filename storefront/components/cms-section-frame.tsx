import Image from "next/image";
import type { ReactNode } from "react";
import type { CMSSectionLayout } from "@/lib/cms";

export function cmsSectionStyle(layout?: CMSSectionLayout) {
  return {
    maxWidth: layout?.contentMaxWidthPx ? `${layout.contentMaxWidthPx}px` : undefined,
    minHeight: layout?.minHeightPx ? `${layout.minHeightPx}px` : undefined,
    paddingTop: layout?.paddingTopPx ? `${layout.paddingTopPx}px` : undefined,
    paddingBottom: layout?.paddingBottomPx ? `${layout.paddingBottomPx}px` : undefined,
    paddingLeft: layout?.paddingInlinePx ? `${layout.paddingInlinePx}px` : undefined,
    paddingRight: layout?.paddingInlinePx ? `${layout.paddingInlinePx}px` : undefined,
    marginLeft: layout?.contentMaxWidthPx ? "auto" : undefined,
    marginRight: layout?.contentMaxWidthPx ? "auto" : undefined,
    width: "100%",
  } as const;
}

export function CMSSectionFrame({
  layout,
  children,
  className = "",
}: {
  layout?: CMSSectionLayout;
  children: ReactNode;
  className?: string;
}) {
  const textAlign = layout?.textAlign || "left";
  const image = layout?.image?.trim();
  const imagePosition = image ? (layout?.imagePosition || "top") : "none";
  const hasImage = Boolean(image) && imagePosition !== "none";

  const copy = (
    <div className="cms-section-layout-copy" style={{ textAlign }}>
      {children}
    </div>
  );

  if (!hasImage || !image) {
    return <div className={`cms-section-layout cms-image-none ${className}`.trim()} style={cmsSectionStyle(layout)}>{copy}</div>;
  }

  const media = (
    <div className="cms-section-layout-image" style={layout?.imageHeightPx ? { minHeight: `${layout.imageHeightPx}px`, height: `${layout.imageHeightPx}px` } : undefined}>
      <Image
        src={image}
        alt={layout?.imageAlt || "Section image"}
        fill
        sizes="(max-width: 900px) 100vw, 50vw"
        style={{ objectFit: "cover" }}
      />
    </div>
  );

  const imageFirst = imagePosition === "left" || imagePosition === "top";

  return (
    <div className={`cms-section-layout cms-image-${imagePosition} ${className}`.trim()} style={cmsSectionStyle(layout)}>
      {imageFirst ? <>{media}{copy}</> : <>{copy}{media}</>}
    </div>
  );
}

export function cmsTextAlign(layout?: CMSSectionLayout) {
  return layout?.textAlign || "left";
}
