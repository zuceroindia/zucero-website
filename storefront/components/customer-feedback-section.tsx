"use client";

import Link from "next/link";
import { ArrowRight, BadgeCheck } from "lucide-react";
import { useEffect, useState } from "react";
import styles from "@/components/customer-feedback-section.module.css";

type Review = {
  id: string;
  rating: number;
  body: string;
  display_name: string;
  image_urls?: string[] | null;
  verified_purchase?: boolean;
  published_at?: string | null;
  created_at: string;
};

export function CustomerFeedbackSection() {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let active = true;
    fetch("/api/feedback")
      .then((response) => response.json())
      .then((data) => {
        if (active) setReviews(Array.isArray(data.reviews) ? data.reviews : []);
      })
      .catch(() => {})
      .finally(() => {
        if (active) setLoaded(true);
      });
    return () => {
      active = false;
    };
  }, []);

  return (
    <section className={styles.section} id="customer-feedback">
      <div className={styles.heading}>
        <div>
          <p className="eyebrow gold">Customer Feedback</p>
          <h2>Sweet words,<br /><em>shared honestly.</em></h2>
        </div>
        <div className={styles.headingCopy}>
          <p>Experiences from verified Zucero customers, published from their own feedback.</p>
          <Link className="text-link" href="/feedback">
            Share your experience <ArrowRight size={15} />
          </Link>
        </div>
      </div>

      {reviews.length > 0 ? (
        <div className={styles.grid}>
          {reviews.slice(0, 6).map((review) => (
            <article className={styles.card} key={review.id}>
              {review.image_urls?.[0] && (
                <div className={styles.imageWrap}>
                  <img src={review.image_urls[0]} alt={"Customer photo shared by " + review.display_name} loading="lazy" />
                </div>
              )}
              <div className={styles.cardBody}>
                <div className={styles.stars} aria-label={review.rating + " out of 5 stars"}>
                  {"★".repeat(review.rating)}<span>{"★".repeat(Math.max(0, 5 - review.rating))}</span>
                </div>
                <blockquote>“{review.body}”</blockquote>
                <footer className={styles.reviewer}>
                  <strong>{review.display_name}</strong>
                  {review.verified_purchase && <span><BadgeCheck size={14} /> Verified purchase</span>}
                </footer>
              </div>
            </article>
          ))}
        </div>
      ) : loaded ? (
        <div className={styles.empty}>
          <p>Customer stories will appear here as verified reviews arrive.</p>
          <Link className="button button-gold" href="/feedback">Share the first review</Link>
        </div>
      ) : (
        <div className={styles.loading}>Loading customer feedback…</div>
      )}
    </section>
  );
}
