import { sanitizeNewsletterHtml } from "../sanitizeHtml";

describe("sanitizeNewsletterHtml", () => {
  it("removes executable elements and event handlers", () => {
    const clean = sanitizeNewsletterHtml(
      '<p onclick="alert(1)">hello</p><script>alert(2)</script><img src="https://example.com/a.png" onerror="alert(3)">'
    );

    expect(clean).toContain("<p>hello</p>");
    expect(clean).not.toContain("<script");
    expect(clean).not.toContain("onclick");
    expect(clean).not.toContain("onerror");
  });

  it("removes dangerous URL schemes and hardens safe links", () => {
    const clean = sanitizeNewsletterHtml(
      '<a href="javascript:alert(1)">bad</a><a href="https://x.com/test">good</a>'
    );

    expect(clean).not.toContain("javascript:");
    expect(clean).toContain('href="https://x.com/test"');
    expect(clean).toContain('rel="noopener noreferrer"');
    expect(clean).toContain('target="_blank"');
  });

  it("removes style and srcdoc attributes", () => {
    const clean = sanitizeNewsletterHtml(
      '<div style="background:url(javascript:alert(1))" srcdoc="<script>alert(2)</script>">safe</div>'
    );

    expect(clean).toBe("<div>safe</div>");
  });
});
