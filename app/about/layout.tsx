const aboutPageSchema = {
  "@context": "https://schema.org",
  "@type": "AboutPage",
  "@id": "https://sinceai.ai/about",
  name: "About Since AI",
  description:
    "Since AI ry is the Finnish nonprofit behind a global AI ecosystem, advancing AI education, practical skills and open collaboration for builders worldwide.",
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
