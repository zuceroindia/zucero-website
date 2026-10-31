export function SectionDivider({ title, light = false }: { title: string; light?: boolean }) {
  const cleanTitle = title.replace(/^\s*\d+\s*[·.\-—:]\s*/, "");
  return <div className={`section-divider${light ? " section-divider-light" : ""}`} role="separator" aria-label={cleanTitle}>
    <strong>{cleanTitle}</strong>
  </div>;
}
