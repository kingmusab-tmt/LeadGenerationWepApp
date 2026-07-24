import sanitizeHtml from "sanitize-html";

/**
 * Sanitizes seller-authored email HTML before it's stored or rendered.
 * Applied both server-side (before saving) and wherever we render a
 * campaign's content ourselves (in-app previews) — email clients strip
 * <script> tags on their own, but our own preview surfaces don't, and a
 * compromised/malicious account should not be able to store arbitrary
 * markup that later executes in another user's browser (e.g. an admin or
 * teammate viewing the same campaign).
 *
 * <style> blocks are intentionally not allowed — inline `style=""`
 * attributes (which are allowed below) cover normal email-template needs
 * without the extra CSS-based attack surface a full stylesheet allows.
 */
export function sanitizeEmailHtml(html: string): string {
  return sanitizeHtml(html, {
    allowedTags: sanitizeHtml.defaults.allowedTags.concat([
      "img",
      "h1",
      "h2",
      "font",
      "center",
      "table",
      "thead",
      "tbody",
      "tr",
      "td",
      "th",
    ]),
    allowedAttributes: {
      ...sanitizeHtml.defaults.allowedAttributes,
      "*": ["style", "class", "align", "width", "height"],
      a: ["href", "name", "target", "rel"],
      img: ["src", "alt", "width", "height", "style"],
      table: ["cellpadding", "cellspacing", "border", "width"],
    },
    allowedSchemes: ["http", "https", "mailto"],
  });
}
