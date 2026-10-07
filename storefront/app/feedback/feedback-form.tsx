"use client";

import { FormEvent, useMemo, useState } from "react";
import { Camera, CheckCircle2, Star } from "lucide-react";
import styles from "@/app/feedback/feedback.module.css";

export function FeedbackForm({ initialOrder = "" }: { initialOrder?: string }) {
  const [orderNumber, setOrderNumber] = useState(initialOrder);
  const [contact, setContact] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [rating, setRating] = useState(5);
  const [body, setBody] = useState("");
  const [images, setImages] = useState<File[]>([]);
  const [consent, setConsent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const imageSummary = useMemo(
    () => images.map((file) => file.name).join(", "),
    [images]
  );

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setSuccess("");
    setBusy(true);

    try {
      const form = new FormData();
      form.set("orderNumber", orderNumber);
      form.set("contact", contact);
      form.set("displayName", displayName);
      form.set("rating", String(rating));
      form.set("body", body);
      form.set("consent", consent ? "true" : "false");
      images.forEach((file) => form.append("images", file));

      const response = await fetch("/api/feedback", { method: "POST", body: form });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Could not submit your review.");

      setSuccess(data.message || "Thank you. Your review is now live.");
      setBody("");
      setImages([]);
      setConsent(false);
    } catch (submissionError) {
      setError(submissionError instanceof Error ? submissionError.message : "Could not submit your review.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form className={styles.form} onSubmit={submit}>
      <div className={styles.formHeading}>
        <p className="eyebrow">Share your review</p>
        <h2>A few words from you.</h2>
        <p>Use the order number and email or mobile number used while placing the order.</p>
      </div>

      <div className={styles.twoCol}>
        <label>
          <span>Order number *</span>
          <input
            required
            value={orderNumber}
            onChange={(event) => setOrderNumber(event.target.value)}
            placeholder="e.g. ZUC-..."
            autoComplete="off"
          />
        </label>
        <label>
          <span>Email or mobile used for the order *</span>
          <input
            required
            value={contact}
            onChange={(event) => setContact(event.target.value)}
            placeholder="Your order contact"
            autoComplete="email"
          />
        </label>
      </div>

      <label>
        <span>Name to show with your review *</span>
        <input
          required
          minLength={2}
          maxLength={80}
          value={displayName}
          onChange={(event) => setDisplayName(event.target.value)}
          placeholder="e.g. Riya S."
        />
      </label>

      <fieldset className={styles.ratingField}>
        <legend>Your rating *</legend>
        <div className={styles.stars} aria-label={rating + " out of 5 stars"}>
          {[1, 2, 3, 4, 5].map((value) => (
            <button
              key={value}
              type="button"
              className={value <= rating ? styles.starActive : styles.star}
              onClick={() => setRating(value)}
              aria-label={"Rate " + value + " star" + (value === 1 ? "" : "s")}
            >
              <Star size={28} fill={value <= rating ? "currentColor" : "none"} />
            </button>
          ))}
        </div>
      </fieldset>

      <label>
        <span>Your experience *</span>
        <textarea
          required
          minLength={10}
          maxLength={1200}
          rows={7}
          value={body}
          onChange={(event) => setBody(event.target.value)}
          placeholder="What did you like about the taste, texture, packaging or how you use Zucero at home?"
        />
        <small>{body.length}/1200</small>
      </label>

      <label className={styles.upload}>
        <Camera size={20} />
        <span>
          <strong>Add photos</strong>
          <small>Optional · up to 3 JPG, PNG or WEBP images · 5 MB each</small>
        </span>
        <input
          type="file"
          accept="image/jpeg,image/png,image/webp"
          multiple
          onChange={(event) => {
            const next = Array.from(event.target.files || []).slice(0, 3);
            setImages(next);
          }}
        />
      </label>
      {imageSummary && <p className={styles.fileNames}>{imageSummary}</p>}

      <label className={styles.consent}>
        <input
          type="checkbox"
          checked={consent}
          onChange={(event) => setConsent(event.target.checked)}
          required
        />
        <span>
          I confirm this review reflects my own experience and I allow Zucero to publish my review,
          display name and uploaded photos on its website and brand channels.
        </span>
      </label>

      {error && <p className={styles.error} role="alert">{error}</p>}
      {success && (
        <p className={styles.success} role="status">
          <CheckCircle2 size={18} /> {success}
        </p>
      )}

      <button className="button button-gold" type="submit" disabled={busy || !consent}>
        {busy ? "Publishing…" : "Publish my review"}
      </button>
      <p className={styles.privacyNote}>
        For verification, your order contact is checked securely and is never displayed with your public review.
      </p>
    </form>
  );
}
