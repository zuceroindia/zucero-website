"use client";

import type { ReactNode } from "react";
import { useCMS } from "@/components/cms-provider";
import { ContentPage } from "@/components/content-page";

export function DynamicPolicyContent({
  policyKey,
  defaultContent,
}: {
  policyKey: "shipping" | "returns" | "refunds" | "privacy" | "terms";
  defaultContent?: ReactNode;
}) {
  const { config } = useCMS();
  const policy = config.policies?.[policyKey];

  if (!policy) {
    return <>{defaultContent}</>;
  }

  return (
    <ContentPage eyebrow={policy.eyebrow} title={policy.title} intro={policy.intro}>
      {policy.sections?.map((section, idx) => (
        <section key={`${section.heading}-${idx}`} style={{ marginBottom: "1.75rem" }}>
          <h2>{section.heading}</h2>
          <p style={{ whiteSpace: "pre-line" }}>{section.content}</p>
        </section>
      ))}
      {policy.bottomNote && (
        <p className="note" style={{ marginTop: "1.25rem" }}>
          {policy.bottomNote}
        </p>
      )}
    </ContentPage>
  );
}
