export type LegacyWordPressResolution =
  | { type: "redirect"; destination: string }
  | { type: "gone" }
  | null;

export const legacyWordPressRedirects: Readonly<Record<string, string>> = {
  "/about": "/about-us",
  "/blog": "/help",
  "/contact-us": "/contact",
  "/contact-us-2": "/contact",
  "/contact-us-3": "/contact",
  "/contact-us-4": "/contact",
  "/faq-3": "/help",
  "/gallery": "/samples",
  "/gallery-2": "/samples",
  "/gallery-3": "/samples",
  "/home": "/",
  "/home-2": "/",
  "/home-3": "/",
  "/home-4": "/",
  "/home-5": "/",
  "/home-6": "/",
  "/home-7": "/",
  "/home-8": "/",
  "/home-9": "/",
  "/home-10": "/",
  "/home-11": "/",
  "/home-12": "/",
  "/home-13": "/",
  "/home-14": "/",
  "/home-15": "/",
  "/index.php": "/",
  "/lp-term-conditions": "/terms",
  "/plagiarism-check": "/plagiarism-ai-review",
  "/portfolio": "/samples",
  "/privacy-policy-2": "/privacy",
  "/proofreading": "/editing-proofreading",
  "/resume-builder": "/tools/cv-builder",
  "/resume-download": "/tools/cv-builder",
  "/services": "/assignment-support",
  "/services-2": "/assignment-support",
  "/sop": "/sop-admissions-writing",
  "/sop-download": "/tools/sop-builder",
  "/start-a-project": "/pricing#quote",
  "/terms-conditions": "/terms",
  "/testimonials": "/reviews",
  "/why-choose-us": "/about-us",
  "/writex_blog": "/help"
};

export const legacyWordPressGonePaths = new Set([
  "/apply-to-educavo",
  "/become-a-teacher",
  "/blog-3-column",
  "/blog-left-sidebar",
  "/blog-right-sidebar",
  "/career",
  "/cart",
  "/checkout",
  "/combating-discrimination-against-international-students",
  "/corporate",
  "/course-five",
  "/course-four",
  "/course-three",
  "/course-two",
  "/courses",
  "/doctoral-degrees",
  "/education",
  "/entertainment",
  "/events",
  "/events-2",
  "/events-3",
  "/fashion",
  "/finance",
  "/graduate-programs",
  "/health-care",
  "/high-school-program-starting-soon-for-covid-19-situation",
  "/how-universities-can-nurture-for-the-climate-crisis",
  "/international-hubs",
  "/legal",
  "/majority-of-students-dissatisfied-with-their-universitys-coronavirus-support",
  "/marketing-advertising",
  "/medical-transcription",
  "/my-account",
  "/online-courses",
  "/profile",
  "/program",
  "/quick-download-button",
  "/sample-page",
  "/shop",
  "/teachers-one",
  "/teachers-three",
  "/teachers-two",
  "/travel",
  "/under-construction",
  "/undergraduate-programs",
  "/university-class-starting-soon-while-the-lovely-valley-team-work",
  "/us-teachers-feel-pressure-to-return-to-class",
  "/video-2"
]);

const legacyWordPressGonePatterns = [
  /^\/\d/,
  /^\/(?:wp-admin|wp-content|wp-includes|wp-json)(?:\/|$)/,
  /^\/(?:category|tag|author|search|page)(?:\/|$)/,
  /^\/20\d{2}(?:\/|$)/,
  /^\/(?:elementskit-content|metform-form|cgi-sys|cdn-cgi)(?:\/|$)/,
  /^\/lp-(?!term-conditions$)/,
  /^\/(?:feed|comments\/feed)$/,
  /^\/(?:xmlrpc|wp-login|wp-cron|wp-comments-post|wp-trackback|wp-signup|wp-activate|wp-links-opml|wp-mail)\.php$/,
  /^\/(?:readme\.html|license\.txt)$/,
  /^\/(?:wp-sitemap(?:-[^/]+)?|sitemap[_-]index|(?:post|page|category|author|tag|news)-sitemap\d*)\.xml$/,
  /^\/sitemap\.xml\.gz$/
];

const legacyWordPressQueryKeys = new Set([
  "attachment_id",
  "author",
  "cat",
  "elementskit_template",
  "feed",
  "m",
  "p",
  "page_id",
  "post_type",
  "s"
]);

function normalizePathname(pathname: string) {
  let decoded = pathname;

  try {
    decoded = decodeURIComponent(pathname);
  } catch {
    // Keep the original path when malformed escape sequences are supplied.
  }

  const normalized = decoded.toLowerCase().replace(/\/{2,}/g, "/");
  return normalized === "/" ? normalized : normalized.replace(/\/+$/, "");
}

export function resolveLegacyWordPressUrl(
  pathname: string,
  searchParams?: URLSearchParams
): LegacyWordPressResolution {
  const normalizedPath = normalizePathname(pathname);
  const destination = legacyWordPressRedirects[normalizedPath];

  if (destination) {
    return { type: "redirect", destination };
  }

  if (
    searchParams &&
    Array.from(searchParams.keys()).some((key) =>
      legacyWordPressQueryKeys.has(key.toLowerCase())
    )
  ) {
    return { type: "gone" };
  }

  if (
    legacyWordPressGonePaths.has(normalizedPath) ||
    legacyWordPressGonePatterns.some((pattern) => pattern.test(normalizedPath))
  ) {
    return { type: "gone" };
  }

  return null;
}
