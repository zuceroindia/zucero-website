"use client";

import Image from "next/image";
import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { useCMS } from "@/components/cms-provider";

export function StoryCarousel() {
  const { config } = useCMS();
  const stories = config.homepage.storyCarousel;
  const viewportRef = useRef<HTMLDivElement>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const [paused, setPaused] = useState(false);

  const moveTo = useCallback((index: number) => {
    if (!stories.length) return;
    const nextIndex = (index + stories.length) % stories.length;
    const viewport = viewportRef.current;
    const card = viewport?.children[nextIndex] as HTMLElement | undefined;
    if (viewport && card) viewport.scrollTo({ left: card.offsetLeft, behavior: "smooth" });
    setActiveIndex(nextIndex);
  }, [stories.length]);

  useEffect(() => {
    if (paused || !stories.length || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const timer = window.setInterval(() => setActiveIndex((current) => {
      const next = (current + 1) % stories.length;
      const viewport = viewportRef.current;
      const card = viewport?.children[next] as HTMLElement | undefined;
      if (viewport && card) viewport.scrollTo({ left: card.offsetLeft, behavior: "smooth" });
      return next;
    }), 7500);
    return () => window.clearInterval(timer);
  }, [paused, stories.length]);

  return (
    <section id="carousel" className="story-carousel" aria-label="Zucero stories" onFocus={() => setPaused(true)} onBlur={(event) => { if (!event.currentTarget.contains(event.relatedTarget)) setPaused(false); }}>
      <div className="carousel-viewport" ref={viewportRef}>
        {stories.map((story) => (
          <Link className="marquee-image" href={story.href || "#"} key={story.id}>
            <Image src={story.image} alt={story.alt || story.title} width={768} height={512} sizes="(max-width: 640px) 82vw, 360px" />
            <span><strong>{story.title}</strong><small>{story.copy}</small></span>
          </Link>
        ))}
      </div>
      <button className="carousel-arrow carousel-arrow-left" type="button" onClick={() => moveTo(activeIndex - 1)} aria-label="Previous Zucero story"><ChevronLeft aria-hidden="true" /></button>
      <button className="carousel-arrow carousel-arrow-right" type="button" onClick={() => moveTo(activeIndex + 1)} aria-label="Next Zucero story"><ChevronRight aria-hidden="true" /></button>
      <p className="carousel-status" aria-live="polite">{activeIndex + 1} / {stories.length}</p>
    </section>
  );
}
