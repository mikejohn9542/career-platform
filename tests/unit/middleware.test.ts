import { NextRequest } from "next/server";
import { describe, expect, it } from "vitest";
import { middleware } from "@/middleware";

function request(url: string, headers: Record<string, string>): NextRequest {
  return new NextRequest(url, { headers });
}

describe("middleware", () => {
  it("redirects plain HTTP on the public domain to HTTPS, keeping the path", () => {
    const response = middleware(request("http://michaeljportfolio.me/projects?x=1", { host: "michaeljportfolio.me", "x-forwarded-proto": "http" }));
    expect(response.status).toBe(308);
    expect(response.headers.get("location")).toBe("https://michaeljportfolio.me/projects?x=1");
  });

  it("lets HTTPS requests through", () => {
    const response = middleware(request("http://michaeljportfolio.me/", { host: "michaeljportfolio.me", "x-forwarded-proto": "https" }));
    expect(response.headers.get("x-middleware-next")).toBe("1");
  });

  it("never redirects Railway's healthcheck or localhost", () => {
    for (const host of ["healthcheck.railway.app", "localhost:3000"]) {
      const response = middleware(request(`http://${host}/`, { host, "x-forwarded-proto": "http" }));
      expect(response.headers.get("x-middleware-next")).toBe("1");
    }
  });
});
