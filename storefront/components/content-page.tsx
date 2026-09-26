import type { ReactNode } from "react";
import { SiteFooter } from "@/components/site-footer";
import { StoreHeader } from "@/components/store-header";
import { CMSSectionFrame, cmsTextAlign } from "@/components/cms-section-frame";
import type { CMSSectionLayout } from "@/lib/cms";

export function ContentPage({
  eyebrow,
  title,
  intro,
  children,
  layout,
}: {
  eyebrow: string;
  title: string;
  intro: string;
  children: ReactNode;
  layout?: CMSSectionLayout;
}) {
  const textAlign = cmsTextAlign(layout);
  return <main className="store-page">
    <StoreHeader />
    <header className="content-hero" style={{ textAlign }}><p className="eyebrow gold">{eyebrow}</p><h1>{title}</h1><p>{intro}</p></header>
    <article className="content-shell"><CMSSectionFrame layout={layout}>{children}</CMSSectionFrame></article>
    <SiteFooter />
  </main>;
}
