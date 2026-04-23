"use client";

import dynamic from "next/dynamic";

interface HackathonCountdownProps {
  startDate: string;
  endDate: string;
}

const TIME_UNITS = ["Days", "Hours", "Minutes", "Seconds"] as const;

function CountdownPlaceholder() {
  return (
    <div className="flex items-center justify-center gap-3 md:gap-6 mb-10">
      {TIME_UNITS.map((label) => (
        <div key={label} className="flex flex-col items-center">
          <div className="w-16 h-16 md:w-20 md:h-20 lg:w-24 lg:h-24 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center backdrop-blur-sm">
            <span className="text-2xl md:text-3xl lg:text-4xl font-bold text-white tabular-nums">
              --
            </span>
          </div>
          <span className="text-xs md:text-sm text-neutral-500 mt-2 font-medium uppercase tracking-wider">
            {label}
          </span>
        </div>
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
