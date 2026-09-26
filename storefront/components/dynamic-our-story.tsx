"use client";

import Link from "next/link";
import { useCMS } from "@/components/cms-provider";
import { ContentPage } from "@/components/content-page";

export function DynamicOurStory() {
  const { config } = useCMS();
  const story = config.ourStory;

  return (
    <ContentPage eyebrow={story.eyebrow} title={story.title} intro={story.intro} layout={config.sectionLayouts?.["ourStory.page"]}>
      {story.storyParagraphs?.map((paragraph, idx) => (
        <p key={idx}>{paragraph}</p>
      ))}
      <p>
        <Link href="/guides/desi-khand">Learn what Desi Khand, Shudh Khand and organic Khand claims actually mean →</Link>
      </p>
      <p>
        <strong>ZUCERO — THE GOOD SUGAR</strong>
      </p>
      {story.disclaimer && <p className="note">{story.disclaimer}</p>}
    </ContentPage>
  );
}
