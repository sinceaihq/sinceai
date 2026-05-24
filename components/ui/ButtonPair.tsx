import Link from "next/link";

interface ButtonPairProps {
  primaryLabel: string;
  primaryHref: string;
  secondaryLabel: string;
  secondaryHref: string;
  className?: string;
}

export function ButtonPair({
  primaryLabel,
  primaryHref,
  secondaryLabel,
  secondaryHref,
  className,
}: ButtonPairProps) {
  const isExternalPrimary = primaryHref.startsWith("http");
  const isExternalSecondary = secondaryHref.startsWith("http");

  return (
    <div className={`flex flex-col sm:flex-row gap-3 ${className ?? ""}`}>
      {isExternalPrimary ? (
        <a
          href={primaryHref}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center justify-center px-8 py-4 text-base font-semibold text-black bg-white rounded-none transition-all duration-300 hover:bg-neutral-100"
        >
          {primaryLabel}
        </a>
      ) : (
        <Link
          href={primaryHref}
          className="inline-flex items-center justify-center px-8 py-4 text-base font-semibold text-black bg-white rounded-none transition-all duration-300 hover:bg-neutral-100"
        >
          {primaryLabel}
        </Link>
      )}

      {isExternalSecondary ? (
        <a
          href={secondaryHref}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center justify-center px-8 py-4 text-base font-semibold text-white rounded-none transition-colors duration-300 border border-white/20 hover:border-white"
        >
          {secondaryLabel}
        </a>
      ) : (
        <Link
          href={secondaryHref}
          className="inline-flex items-center justify-center px-8 py-4 text-base font-semibold text-white rounded-none transition-colors duration-300 border border-white/20 hover:border-white"
        >
          {secondaryLabel}
        </Link>
      )}
    </div>
  );
}
