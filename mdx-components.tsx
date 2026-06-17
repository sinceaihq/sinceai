import type { MDXComponents } from "mdx/types";
import Link from "next/link";
import React from "react";
import { slugify } from "@/lib/utils";

/**
 * Turn heading children into a stable URL slug for anchor links / table of contents.
 */
export function slugifyHeading(children: React.ReactNode): string {
  const text = React.Children.toArray(children)
    .map((child) => (typeof child === "string" ? child : ""))
    .join(" ");
  return slugify(text);
}

function Anchor({ id }: { id: string }) {
  return (
    <a
      href={`#${id}`}
      aria-label="Link to this section"
      className="ml-2 text-neutral-600 opacity-0 group-hover:opacity-100 transition-opacity no-underline"
    >
      #
    </a>
  );
}

/**
 * Design-system styled components for rendered MDX article bodies.
 * Sharp corners, mono font, white headings, muted body text.
 */
export function useMDXComponents(components: MDXComponents): MDXComponents {
  return {
    h2: ({ children }) => {
      const id = slugifyHeading(children);
      return (
        <h2
          id={id}
          className="group scroll-mt-28 text-2xl md:text-3xl font-bold text-white tracking-tight mt-16 mb-5"
        >
          {children}
          <Anchor id={id} />
        </h2>
      );
    },
    h3: ({ children }) => {
      const id = slugifyHeading(children);
      return (
        <h3
          id={id}
          className="group scroll-mt-28 text-xl md:text-2xl font-bold text-white tracking-tight mt-10 mb-4"
        >
          {children}
          <Anchor id={id} />
        </h3>
      );
    },
    h4: ({ children }) => (
      <h4 className="text-lg font-bold text-white tracking-tight mt-8 mb-3">
        {children}
      </h4>
    ),
    p: ({ children }) => (
      <p className="text-base md:text-lg text-neutral-300 leading-relaxed mb-6">
        {children}
      </p>
    ),
    ul: ({ children }) => (
      <ul className="mb-6 space-y-2.5 text-neutral-300 list-disc pl-5 marker:text-neutral-600">
        {children}
      </ul>
    ),
    ol: ({ children }) => (
      <ol className="mb-6 space-y-2.5 text-neutral-300 list-decimal pl-5 marker:text-neutral-500">
        {children}
      </ol>
    ),
    li: ({ children }) => <li className="leading-relaxed pl-1">{children}</li>,
    a: ({ href, children }) => {
      const isInternal = href?.startsWith("/");
      if (isInternal) {
        return (
          <Link
            href={href as string}
            className="text-white underline decoration-white/30 underline-offset-4 hover:decoration-white transition-colors"
          >
            {children}
          </Link>
        );
      }
      return (
        <a
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          className="text-white underline decoration-white/30 underline-offset-4 hover:decoration-white transition-colors"
        >
          {children}
        </a>
      );
    },
    strong: ({ children }) => (
      <strong className="font-semibold text-white">{children}</strong>
    ),
    em: ({ children }) => <em className="italic text-neutral-200">{children}</em>,
    blockquote: ({ children }) => (
      <blockquote className="my-8 border-l-2 border-white/20 pl-6 text-lg text-neutral-200 italic">
        {children}
      </blockquote>
    ),
    hr: () => <hr className="my-12 border-white/10" />,
    code: ({ children }) => (
      <code className="px-1.5 py-0.5 text-sm bg-white/[0.06] border border-white/10 text-neutral-200">
        {children}
      </code>
    ),
    pre: ({ children }) => (
      <pre className="my-6 p-5 overflow-x-auto bg-white/[0.03] border border-white/10 text-sm text-neutral-200">
        {children}
      </pre>
    ),
    ...components,
  };
}
