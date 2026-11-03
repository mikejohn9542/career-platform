import { describe, expect, it } from "vitest";
import { createDbClient, sslOptionsFrom } from "@/db/client";

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

describe("sslOptionsFrom", () => {
  it("returns undefined when no CA path is configured", () => {
    expect(sslOptionsFrom({})).toBeUndefined();
  });

  it("reads the CA file and demands verification when a path is set", () => {
    const options = sslOptionsFrom({ DATABASE_CA_CERT_PATH: "tests/fixtures/fake-ca.pem" });
    expect(options?.rejectUnauthorized).toBe(true);
    expect(options?.ca).toContain("BEGIN CERTIFICATE");
  });

  it("throws immediately when the CA path is set but unreadable", () => {
    expect(() => sslOptionsFrom({ DATABASE_CA_CERT_PATH: "no/such/ca.pem" })).toThrow(/DATABASE_CA_CERT_PATH/);
  });
});

describe("createDbClient SSL wiring", () => {
  it("leaves ssl unset for local development", async () => {
    const client = createDbClient(UNREACHABLE, {});
    const options = (client.pool as unknown as { options: Record<string, unknown> }).options;
    expect(options.ssl).toBeUndefined();
    await client.close();
  });

  it("passes the CA through to the pool", async () => {
    const client = createDbClient(UNREACHABLE, { DATABASE_CA_CERT_PATH: "tests/fixtures/fake-ca.pem" });
    const options = (client.pool as unknown as { options: { ssl?: { rejectUnauthorized: boolean } } }).options;
    expect(options.ssl?.rejectUnauthorized).toBe(true);
    await client.close();
  });
});
