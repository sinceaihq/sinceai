"use client";
import React from "react";

export function TrustBar() {
  // All logos mixed together (partners + supporters)
  const allLogos = [
    { name: "Bayer", logo: "/assets/sponsors/Bayer.svg" },
    { name: "Valmet", logo: "/assets/sponsors/valmet.png" },
    { name: "University of Turku", logo: "/assets/supports/universityofturku.png" },
    { name: "Sandvik", logo: "/assets/sponsors/sandvik.png" },
    { name: "Turku AMK", logo: "/assets/supports/turkuamk.png" },
    { name: "Kongsberg", logo: "/assets/sponsors/kongsberg.png" },
    { name: "ElevenLabs", logo: "/assets/sponsors/elevenlabs.png" },
    { name: "City of Turku", logo: "/assets/supports/cityofturku.png" },
    { name: "Antler", logo: "/assets/sponsors/antler.png" },
    { name: "Boost Turku", logo: "/assets/supports/boost.svg" },
    { name: "Featherless.ai", logo: "/assets/sponsors/featherless.svg" },
    { name: "AI Mad Lab", logo: "/assets/supports/aimadlab.svg" },
    { name: "Aalto AI", logo: "/assets/supports/aaltoai.png" },
    { name: "Skillio", logo: "/assets/sponsors/Skillio.png" },
    { name: "Eisko", logo: "/assets/sponsors/eisko.svg" },
    { name: "A'Pelago", logo: "/assets/sponsors/apelago.png" },
    { name: "Business Turku", logo: "/assets/sponsors/businessturku.png" },
    { name: "n8n", logo: "/assets/sponsors/n8n.svg" },
    { name: "Lovable", logo: "/assets/sponsors/lovable.png" },
  ];

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
                    <img
                      src={logo.logo}
                      alt={`${logo.name} logo`}
                      style={{ height: '64px', width: 'auto' }}
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
          gap: 4rem;
          width: fit-content;
          animation: scroll-left 45s linear infinite;
        }

        .logo-scroll-wrapper:hover {
          animation-play-state: paused;
        }

        .logo-set {
          display: flex;
          gap: 4rem;
          flex-shrink: 0;
        }

        .logo-item {
          display: flex;
          align-items: center;
          justify-center: center;
          width: 8rem;
          height: 4rem;
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
