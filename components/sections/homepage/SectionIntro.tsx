/** One header style for every homepage section: eyebrow, title, optional lede. */
export function SectionIntro({ id, eyebrow, title, lede }: { id: string; eyebrow: string; title: string; lede?: string }) {
  return (
    <header className="max-w-3xl">
      <p className="text-xs font-mono uppercase tracking-widest text-white/55 mb-4">{eyebrow}</p>
      <h2 id={id} className="text-4xl md:text-5xl font-bold tracking-tight text-white text-balance">
        {title}
      </h2>
      {lede && <p className="mt-6 text-base md:text-lg text-neutral-300 leading-relaxed text-pretty">{lede}</p>}
    </header>
  );
}
