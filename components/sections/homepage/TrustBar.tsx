"use client";
import React from "react";
import { partnerLogos } from "@/lib/partners";

export function TrustBar() {
  // All logos mixed together (partners + supporters)
  const allLogos = partnerLogos;

  return (
    <section className="py-16 px-6 bg-black border-y border-white/5 overflow-hidden">
      <div className="max-w-7xl mx-auto">
        <p className="text-xs uppercase tracking-wider text-neutral-600 font-semibold text-center mb-10">
          Trusted & Supported By
        </p>

        {/* Infinite scrolling logos - truly seamless */}
        <div className="logo-scroll-container">
          <div className="logo-scroll-wrapper">
            {/* Render logos 3 times for seamless loop */}
            {[1, 2, 3].map((setNum) => (
              <div key={`set-${setNum}`} className="logo-set">
                {allLogos.map((logo, index) => (
                  <div
                    key={`logo-${setNum}-${index}`}
                    className="logo-item"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={logo.logo}
                      alt={`${logo.name} logo`}
                      style={{ height: '36px', width: 'auto', maxWidth: '110px' }}
                      className="object-contain grayscale opacity-50 hover:grayscale-0 hover:opacity-100 transition-all duration-300"
                    />
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>
      </div>

      <style jsx>{`
        .logo-scroll-container {
          position: relative;
          width: 100%;
          overflow: hidden;
        }

        .logo-scroll-wrapper {
          display: flex;
          gap: 3rem;
          width: fit-content;
          animation: scroll-left 45s linear infinite;
        }

        .logo-scroll-wrapper:hover {
          animation-play-state: paused;
        }

        .logo-set {
          display: flex;
          gap: 3rem;
          flex-shrink: 0;
        }

        .logo-item {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 7rem;
          height: 3rem;
          flex-shrink: 0;
        }

        @keyframes scroll-left {
          0% {
            transform: translateX(0);
          }
          100% {
            transform: translateX(calc(-100% / 3));
          }
        }
      `}</style>
    </section>
  );
}
