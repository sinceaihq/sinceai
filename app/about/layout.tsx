const aboutPageSchema = {
  "@context": "https://schema.org",
  "@type": "AboutPage",
  "@id": "https://sinceai.ai/about",
  name: "About Since AI",
  description:
    "Since AI is a global execution-focused AI innovation ecosystem. A non-profit connecting 10,000+ AI builders with leading AI companies, research groups, and investors.",
  url: "https://sinceai.ai/about",
  mainEntity: { "@id": "https://sinceai.ai/#organization" },
};

export default function AboutLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(aboutPageSchema) }}
      />
      {children}
    </>
  );
}
