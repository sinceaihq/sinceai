const aboutPageSchema = {
  "@context": "https://schema.org",
  "@type": "AboutPage",
  "@id": "https://sinceai.ai/about",
  name: "About Since AI",
  description:
    "Since AI ry is a Finnish nonprofit association whose mission is to advance AI education, practical skills, technological literacy, and open collaboration for the broader community.",
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
