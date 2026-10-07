import type { Metadata } from "next";
import { StoreHeader } from "@/components/store-header";
import { SiteFooter } from "@/components/site-footer";
import { FeedbackForm } from "@/app/feedback/feedback-form";
import styles from "@/app/feedback/feedback.module.css";

export const metadata: Metadata = {
  title: "Share Your Zucero Experience",
  description: "Share a verified Zucero customer review and optional product photos.",
  alternates: { canonical: "/feedback" },
  robots: { index: true, follow: true },
};

export default async function FeedbackPage({
  searchParams,
}: {
  searchParams: Promise<{ order?: string | string[] }>;
}) {
  const params = await searchParams;
  const order = Array.isArray(params.order) ? params.order[0] : params.order || "";

  return (
    <main className="store-page">
      <StoreHeader />
      <section className={styles.page}>
        <div className={styles.intro}>
          <p className="eyebrow gold">Customer Feedback</p>
          <h1>Your experience<br /><em>matters to us.</em></h1>
          <p>
            Tell us how Zucero became part of your everyday sweetness. Verified customer reviews
            are published on our website so others can make a more informed choice.
          </p>
          <div className={styles.promise}>
            <span>Verified purchase</span>
            <span>Up to 3 photos</span>
            <span>Published after order verification</span>
          </div>
        </div>
        <FeedbackForm initialOrder={order} />
      </section>
      <SiteFooter />
    </main>
  );
}
