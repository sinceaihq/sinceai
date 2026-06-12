import Link from "next/link";
import { PartnerMarquee } from "./PartnerMarquee";
import ORG from "@/lib/org";

export function Hero() {
  return (
    <section className="relative bg-black px-6 h-screen max-h-[1100px] overflow-hidden flex flex-col justify-center">
      <div
        className="mx-auto w-full max-w-6xl pt-[90px] pb-24 md:pt-0 md:pb-0"
      >
        <h1 className="text-white leading-none" style={{ fontSize: "clamp(min(52px, 11vw), 6vw, 100px)" }}>
          Global<br />execution-<br />focused AI<br />innovation<br />ecosystem.
        </h1>

        <p className="text-sm text-neutral-400 mt-6">
          where frontier AI becomes shipped products.
        </p>

        <p className="text-sm text-white mt-8 mb-4">
          <span className="inline-block w-1.5 h-1.5 rounded-full bg-green-500 mr-2 align-middle" />
          Since AI Hackathon 2026 &thinsp;·&thinsp; €50,000 cash prize pool &thinsp;·&thinsp; Registration open
        </p>

        <div className="flex flex-col sm:flex-row sm:flex-wrap gap-3">
          <Link
            href="/hackathon"
            className="inline-flex items-center justify-center bg-white text-black rounded-none px-6 py-3 font-semibold hover:bg-neutral-100 transition-colors cursor-pointer text-sm"
          >
            Learn more →
          </Link>
          <Link
            href="/partners"
            className="inline-flex items-center justify-center border border-white/20 text-white rounded-none px-6 py-3 font-semibold hover:border-white transition-colors cursor-pointer text-sm"
          >
            Partner with Since AI →
          </Link>
          <div className="flex gap-3">
            <a
              href={ORG.social.discord}
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Join the Since AI Discord"
              className="inline-flex flex-1 sm:flex-none items-center justify-center gap-2 border border-white/20 text-white rounded-none px-6 py-3 font-semibold hover:border-white transition-colors cursor-pointer text-sm"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
                <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z"/>
              </svg>
              Discord
            </a>
            <a
              href={ORG.social.telegram}
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Join the Since AI Telegram"
              className="inline-flex flex-1 sm:flex-none items-center justify-center gap-2 border border-white/20 text-white rounded-none px-6 py-3 font-semibold hover:border-white transition-colors cursor-pointer text-sm"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
                <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/>
              </svg>
              Telegram
            </a>
          </div>
        </div>
      </div>

      {/* Marquee anchored to the bottom of the hero viewport */}
      <div className="absolute bottom-0 left-0 right-0">
        <PartnerMarquee />
      </div>
    </section>
  );
}
