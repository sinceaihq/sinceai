import { ImageResponse } from "@vercel/og";

export const runtime = "edge";

export async function GET() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "1200px",
          height: "630px",
          display: "flex",
          flexDirection: "column",
          position: "relative",
          fontFamily: "Inter, sans-serif",
        }}
      >
        {/* Background image with dark overlay */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="https://sinceai.fi/assets/images/educity.jpg"
          alt=""
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            width: "1200px",
            height: "630px",
            objectFit: "cover",
          }}
        />
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            width: "1200px",
            height: "630px",
            background: "rgba(0,0,0,0.7)",
          }}
        />

        {/* Center content */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            flex: 1,
            padding: "60px 80px",
            position: "relative",
            zIndex: 1,
          }}
        >
          <div
            style={{
              fontSize: "14px",
              fontWeight: 600,
              color: "rgba(255,255,255,0.7)",
              letterSpacing: "4px",
              textTransform: "uppercase",
              marginBottom: "24px",
            }}
          >
            OFFICIAL MLH PARTNER EVENT
          </div>
          <div
            style={{
              fontSize: "64px",
              fontWeight: 700,
              color: "#ffffff",
              lineHeight: 1.1,
              textAlign: "center",
              marginBottom: "16px",
              letterSpacing: "-2px",
            }}
          >
            Since AI Hackathon 2026
          </div>
          <div
            style={{
              fontSize: "24px",
              fontWeight: 400,
              color: "rgba(255,255,255,0.8)",
              marginBottom: "32px",
            }}
          >
            Europe&apos;s Premier AI Hackathon
          </div>
          <div
            style={{
              fontSize: "16px",
              fontWeight: 500,
              color: "rgba(255,255,255,0.6)",
              display: "flex",
              gap: "24px",
            }}
          >
            <span>Turku, Finland</span>
            <span style={{ color: "rgba(255,255,255,0.3)" }}>—</span>
            <span>November 2026</span>
            <span style={{ color: "rgba(255,255,255,0.3)" }}>—</span>
            <span>1000+ Participants</span>
          </div>
        </div>

        {/* Bottom strip */}
        <div
          style={{
            position: "absolute",
            bottom: 0,
            left: 0,
            width: "1200px",
            height: "60px",
            background:
              "linear-gradient(to top, rgba(0,0,0,0.9), rgba(0,0,0,0.3))",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1,
          }}
        >
          <span
            style={{
              fontSize: "14px",
              fontWeight: 500,
              color: "rgba(255,255,255,0.5)",
              letterSpacing: "1px",
            }}
          >
            sinceai.fi/hackathon
          </span>
        </div>
      </div>
    ),
    {
      width: 1200,
      height: 630,
    }
  );
}
