"use client";

import React from "react";
import dynamic from "next/dynamic";

interface HackathonCountdownProps {
  startDate: string;
  endDate: string;
}

const TIME_UNITS = ["Days", "Hours", "Minutes", "Seconds"] as const;

function CountdownPlaceholder() {
  return (
    <div
      className="bg-white/[0.04] border border-white/10 px-4 py-3"
      style={{
        display: "grid",
        gridTemplateColumns: "auto 1fr auto 1fr auto 1fr auto",
        rowGap: "6px",
        columnGap: "8px",
        alignItems: "center",
        maxWidth: "100%",
      }}
    >
      <span
        className="text-xs uppercase tracking-widest text-neutral-400 pb-2 border-b border-white/10 mb-1"
        style={{ gridColumn: "1 / -1" }}
      >
        until Since AI Innovation Event 2026 begins
      </span>

      {TIME_UNITS.map((label, i) => (
        <React.Fragment key={label}>
          <span
            className="text-white font-medium leading-none"
            style={{ fontSize: "clamp(24px, 6.5vw, 80px)", letterSpacing: "-0.03em", gridRow: 2 }}
          >
            00
          </span>
          {i < TIME_UNITS.length - 1 && (
            <span
              className="text-white/25 leading-none text-center"
              style={{ fontSize: "clamp(16px, 3.5vw, 48px)", gridRow: 2 }}
            >
              :
            </span>
          )}
        </React.Fragment>
      ))}
      {TIME_UNITS.map((label, i) => (
        <React.Fragment key={`label-${label}`}>
          <span
            className="text-xs uppercase tracking-widest text-neutral-400"
            style={{ gridRow: 3 }}
          >
            {label.toLowerCase()}
          </span>
          {i < TIME_UNITS.length - 1 && <span style={{ gridRow: 3 }} />}
        </React.Fragment>
      ))}
    </div>
  );
}

const ClientCountdownTimer = dynamic(
  () => import("@/components/countdown-timer").then((mod) => mod.CountdownTimer),
  {
    ssr: false,
    loading: CountdownPlaceholder,
  }
);

export function HackathonCountdown({
  startDate,
  endDate,
}: HackathonCountdownProps) {
  return <ClientCountdownTimer startDate={startDate} endDate={endDate} />;
}
