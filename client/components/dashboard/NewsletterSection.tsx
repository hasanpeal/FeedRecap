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
        className="prose prose-invert max-w-none p-4 border border-gray-800 rounded-lg bg-[#111]"
        dangerouslySetInnerHTML={{
          __html: newlatestNewsletter || "<p>No newsletters available.</p>",
        }}
      />
    </div>
  );
};
