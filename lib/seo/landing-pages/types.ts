export type SeoLandingSection = {
  id: string;
  title: string;
  level: 2 | 3;
  paragraphs: string[];
  bullets?: string[];
};

export type SeoFaqItem = {
  question: string;
  answer: string;
};

export type SeoRelatedLink = {
  href: string;
  label: string;
};

export type SeoLandingPageConfig = {
  slug: string;
  metaTitle: string;
  metaDescription: string;
  keywords: string[];
  h1: string;
  heroSubtitle: string;
  sections: SeoLandingSection[];
  faq: SeoFaqItem[];
  relatedLinks: SeoRelatedLink[];
};
