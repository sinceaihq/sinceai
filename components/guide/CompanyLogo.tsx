import Image from "next/image";
import { cn } from "@/lib/utils";

/**
 * Approved logo when the repository has one; otherwise a clean wordmark in the
 * site typeface (never a scraped logo).
 */
export function CompanyLogo({
  name,
  logo,
  className,
  sizes = "160px",
  decorative = false,
}: {
  name: string;
  logo?: { src: string; width: number; height: number };
  className?: string;
  sizes?: string;
  /** The name is already rendered as text next to the logo. */
  decorative?: boolean;
}) {
  if (!logo) {
    return (
      <span
        className={cn(
          "flex h-full w-full items-center font-mono text-base font-bold uppercase tracking-widest text-white",
          className,
        )}
      >
        {name}
      </span>
    );
  }
  return (
    <span className={cn("relative block h-full w-full", className)}>
      <Image
        src={logo.src}
        alt={decorative ? "" : `${name} logo`}
        fill
        sizes={sizes}
        className="object-contain object-left"
      />
    </span>
  );
}
