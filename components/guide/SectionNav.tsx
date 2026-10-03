/**
 * Sticky in-page navigation. Plain anchor links — works without JavaScript and
 * keeps every section one tap away while walking between buildings.
 */
export function SectionNav({ items }: { items: { id: string; label: string }[] }) {
  return (
    <nav
      aria-label="On this page"
      className="guide-no-print sticky top-(--guide-header-h) z-30 border-y border-white/10 bg-black/90 backdrop-blur-md"
    >
      <ul className="mx-auto flex max-w-5xl gap-1 overflow-x-auto px-4 py-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {items.map((item) => (
          <li key={item.id} className="shrink-0">
            <a
              href={`#${item.id}`}
              className="flex min-h-11 items-center px-3 text-[11px] font-mono uppercase tracking-widest text-neutral-400 transition-colors hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-white"
            >
              {item.label}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}
