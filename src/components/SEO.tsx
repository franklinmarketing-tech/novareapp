import { Helmet } from "react-helmet-async";

interface SEOProps {
  title: string;
  description: string;
  /** Canonical URL path (e.g. "/cliente/meus-dados"). If omitted, uses current location. */
  canonicalPath?: string;
  /** Page type for OpenGraph (default: "website"). */
  type?: "website" | "article";
  /** Image URL for OpenGraph/Twitter (absolute URL preferred). */
  image?: string;
  /** Whether the page should be indexed by search engines. Default true. */
  index?: boolean;
}

const SITE_NAME = "Novare";
const DEFAULT_IMAGE = "/og-image.png";

/**
 * Centralized SEO component. Sets title, meta description, canonical link
 * and OpenGraph/Twitter tags. Title is clamped to <60 chars and description
 * to <160 chars (best practice for search snippets).
 */
export const SEO = ({
  title,
  description,
  canonicalPath,
  type = "website",
  image,
  index = true,
}: SEOProps) => {
  const fullTitle = title.includes(SITE_NAME) ? title : `${title} | ${SITE_NAME}`;
  const safeTitle = fullTitle.length > 60 ? `${fullTitle.slice(0, 57)}...` : fullTitle;
  const safeDescription =
    description.length > 160 ? `${description.slice(0, 157)}...` : description;

  const origin =
    typeof window !== "undefined" ? window.location.origin : "https://novareapp.com.br";
  const path =
    canonicalPath ??
    (typeof window !== "undefined" ? window.location.pathname : "/");
  const canonicalUrl = `${origin}${path}`;
  const ogImage = image ?? `${origin}${DEFAULT_IMAGE}`;

  return (
    <Helmet>
      <title>{safeTitle}</title>
      <meta name="description" content={safeDescription} />
      <link rel="canonical" href={canonicalUrl} />
      {!index && <meta name="robots" content="noindex, nofollow" />}

      {/* Open Graph */}
      <meta property="og:title" content={safeTitle} />
      <meta property="og:description" content={safeDescription} />
      <meta property="og:type" content={type} />
      <meta property="og:url" content={canonicalUrl} />
      <meta property="og:image" content={ogImage} />
      <meta property="og:site_name" content={SITE_NAME} />

      {/* Twitter */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={safeTitle} />
      <meta name="twitter:description" content={safeDescription} />
      <meta name="twitter:image" content={ogImage} />
    </Helmet>
  );
};

export default SEO;
