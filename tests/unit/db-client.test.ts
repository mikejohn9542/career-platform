import { describe, expect, it } from "vitest";
import { createDbClient } from "@/db/client";

const UNREACHABLE = "postgresql://user:pass@127.0.0.1:1/none";

describe("createDbClient", () => {
  it("survives an idle-connection error instead of crashing the server", async () => {
    const client = createDbClient(UNREACHABLE);
    expect(client.pool).toBeDefined();
    expect(() => client.pool?.emit("error", new Error("Connection terminated unexpectedly"))).not.toThrow();
    await client.close();
  });

  it("gives up on an unreachable database within seconds", async () => {
    const client = createDbClient(UNREACHABLE);
    const options = (client.pool as unknown as { options: Record<string, unknown> }).options;
    expect(options.connectionTimeoutMillis).toBe(5000);
    expect(options.query_timeout).toBe(10000);
    await client.close();
  });
});
