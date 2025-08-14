"use client";

import { useEffect, useRef } from "react";
import { XLogo } from "./XLogo";

interface NewsletterSectionProps {
  latestNewsletter: string | null;
  newlatestNewsletter: string | null;
  newsID: string | null;
  onShareOnX: () => void;
}

export const NewsletterSection = ({
  latestNewsletter,
  newlatestNewsletter,
  newsID,
  onShareOnX,
}: NewsletterSectionProps) => {
  const contentRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const container = contentRef.current;
    if (!container) return;

    const anchors = Array.from(
      container.querySelectorAll("a")
    ) as HTMLAnchorElement[];
    const emphasisNodes = Array.from(
      container.querySelectorAll("em, i")
    ) as HTMLElement[];

    // Remove underline and green color from all links and emphasis elements inside the newsletter
    anchors.forEach((anchor) => {
      anchor.style.setProperty("text-decoration", "none", "important");
      anchor.style.setProperty("color", "inherit", "important");
      anchor.style.setProperty("font-weight", "inherit", "important");
    });
    emphasisNodes.forEach((elem) => {
      elem.style.setProperty("text-decoration", "none", "important");
      elem.style.setProperty("color", "inherit", "important");
      elem.style.setProperty("font-weight", "inherit", "important");
    });

    // Re-underline only the first 15 "View Post" links
    let underlinedCount = 0;
    for (const anchor of anchors) {
      const text = anchor.textContent?.trim().toLowerCase();
      if (text === "view post" && underlinedCount < 15) {
        anchor.style.setProperty("text-decoration", "underline", "important");
        anchor.style.setProperty("color", "#7FFFD4", "important");
        anchor.style.setProperty("font-weight", "500", "important");
        underlinedCount += 1;
      }
      if (underlinedCount >= 15) break;
    }
  }, [newlatestNewsletter]);

  return (
    <div className="space-y-4 rounded-xl border border-gray-800 bg-black p-6">
      <div className="flex justify-between items-center">
        <h3 className="text-xl font-semibold text-[#7FFFD4]">
          &nbsp;Latest Newsletter
        </h3>
        {latestNewsletter !==
          "Thank you for signing up. Please wait for your first newsletter to generate" && (
          <button
            onClick={onShareOnX}
            className="hidden md:flex bg-[#7FFFD4] text-black px-4 py-2 rounded-lg transition hover:bg-[#00CED1] items-center gap-1"
          >
            Share on
            <XLogo size={14} />
          </button>
        )}
      </div>

      <div
        id="newsletter-content"
        ref={contentRef}
        className="prose prose-invert max-w-none p-4 border border-gray-800 rounded-lg bg-[#111]"
        dangerouslySetInnerHTML={{
          __html: newlatestNewsletter || "<p>No newsletters available.</p>",
        }}
      />
    </div>
  );
};
