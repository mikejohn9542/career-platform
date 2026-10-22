import { NextResponse } from "next/server";
import { contentService } from "@/lib/content-service";

// A real read, not a ping: it answers the same question the page asks, so a 200 here means the
// page can render its projects from the database.
export const dynamic = "force-dynamic";

export async function GET(): Promise<NextResponse> {
  const { projects, source } = await contentService.getSiteContent();
  const healthy = projects === "available";

  return NextResponse.json(
    {
      status: healthy ? "ok" : "projects_unavailable",
      source,
      checkedAt: new Date().toISOString(),
    },
    {
      status: healthy ? 200 : 503,
      headers: { "cache-control": "no-store" },
    },
  );
}
