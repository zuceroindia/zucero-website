"use client";

import type { ReactNode } from "react";
import { useCMS } from "@/components/cms-provider";
import { ContentPage } from "@/components/content-page";

export function DynamicGuideContent({
  guideKey,
  defaultContent,
}: {
  guideKey: "desiKhand" | "sugarAlternatives";
  defaultContent?: ReactNode;
}) {
  const { config } = useCMS();
  const guide = config.guides?.[guideKey];

  if (!guide) {
    return <>{defaultContent}</>;
  }

  return (
    <ContentPage eyebrow={guide.eyebrow} title={guide.title} intro={guide.intro} layout={config.sectionLayouts?.[`guide.${guideKey}`]}>
      {defaultContent}
      {guide.faqs && guide.faqs.length > 0 && (
        <section style={{ marginTop: "2rem" }}>
          <h2>Frequently asked questions (from CMS)</h2>
          {guide.faqs.map((item, idx) => (
            <article key={`${item.question}-${idx}`} style={{ marginBottom: "1.25rem" }}>
              <h3>{item.question}</h3>
              <p style={{ whiteSpace: "pre-line" }}>{item.answer}</p>
            </article>
          ))}
        </section>
      )}
    </ContentPage>
  );
}
