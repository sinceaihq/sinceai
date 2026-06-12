import { ImageResponse } from "next/og";
import { getPostBySlug, BLOG_CATEGORIES } from "@/lib/blog";

export const runtime = "edge";

const WIDTH = 1200;
const HEIGHT = 630;

export function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const slug = searchParams.get("slug") ?? "";
  const post = getPostBySlug(slug);

  const title = post?.title ?? "Since AI Blog";
  const category = post
    ? BLOG_CATEGORIES[post.category].label
    : "AI Builders Community";
  const minutes = post?.readingTime;

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          backgroundColor: "#000000",
          padding: "72px",
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
          <div
            style={{
              width: "20px",
              height: "20px",
              backgroundColor: "#FF2D78",
            }}
          />
          <div
            style={{
              fontSize: "26px",
              color: "rgba(255,255,255,0.6)",
              textTransform: "uppercase",
              letterSpacing: "0.18em",
            }}
          >
            {category}
          </div>
        </div>

        <div
          style={{
            display: "flex",
            fontSize: title.length > 60 ? "64px" : "76px",
            fontWeight: 700,
            color: "#ffffff",
            lineHeight: 1.1,
            letterSpacing: "-0.02em",
            maxWidth: "1000px",
          }}
        >
          {title}
        </div>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            fontSize: "28px",
            color: "rgba(255,255,255,0.6)",
          }}
        >
          <div style={{ display: "flex", color: "#ffffff", fontWeight: 600 }}>
            sinceai.ai
          </div>
          <div style={{ display: "flex" }}>
            {minutes ? `${minutes} min read` : "Since AI"}
          </div>
        </div>
      </div>
    ),
    { width: WIDTH, height: HEIGHT }
  );
}
