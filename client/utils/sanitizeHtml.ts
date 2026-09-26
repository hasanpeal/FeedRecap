const BLOCKED_TAGS = new Set([
  "script", "style", "iframe", "object", "embed", "form", "input", "button",
  "textarea", "select", "option", "svg", "math", "link", "meta", "base"
]);

const URL_ATTRIBUTES = new Set(["href", "src", "xlink:href", "formaction"]);

function isSafeUrl(value: string): boolean {
  const trimmed = value.trim();
  if (!trimmed || trimmed.startsWith("#") || trimmed.startsWith("/")) return true;
  try {
    const url = new URL(trimmed, window.location.origin);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

// Defense-in-depth for newsletters already stored before server-side escaping
// was introduced. New newsletters are also neutralized before marked() runs.
export function sanitizeNewsletterHtml(html: string): string {
  if (typeof window === "undefined") return "";

  const doc = new DOMParser().parseFromString(html, "text/html");
  const elements = Array.from(doc.body.querySelectorAll("*"));

  for (const element of elements) {
    const tag = element.tagName.toLowerCase();
    if (BLOCKED_TAGS.has(tag)) {
      element.remove();
      continue;
    }

    for (const attribute of Array.from(element.attributes)) {
      const name = attribute.name.toLowerCase();
      if (
        name.startsWith("on") ||
        name === "srcdoc" ||
        name === "style" ||
        (URL_ATTRIBUTES.has(name) && !isSafeUrl(attribute.value))
      ) {
        element.removeAttribute(attribute.name);
      }
    }

    if (tag === "a") {
      element.setAttribute("rel", "noopener noreferrer");
      if (element.hasAttribute("href")) element.setAttribute("target", "_blank");
    }
  }

  return doc.body.innerHTML;
}
