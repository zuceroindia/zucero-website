export function SectionDivider({ title, light = false }: { number?: string; title: string; light?: boolean }) {
  return <div className={`section-divider${light ? " section-divider-light" : ""}`} role="separator" aria-label={title}>
    <strong>{title}</strong>
  </div>;
}
