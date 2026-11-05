import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { Client } from "pg";
import { afterAll, describe, expect, it } from "vitest";
import { createDbClient, poolConfigFrom, sslOptionsFrom } from "@/db/client";

const UNREACHABLE = "postgresql://user:pass@127.0.0.1:1/none";

// Resolved from this file, not from process.cwd(), so the suite does not depend on where it is run.
const FAKE_CA = fileURLToPath(new URL("../fixtures/fake-ca.pem", import.meta.url));
const FAKE_CA_CONTENTS = fs.readFileSync(FAKE_CA, "utf8");

const scratch = fs.mkdtempSync(path.join(os.tmpdir(), "db-client-test-"));
afterAll(() => fs.rmSync(scratch, { recursive: true, force: true }));

function writeScratch(name: string, contents: string): string {
  const file = path.join(scratch, name);
  fs.writeFileSync(file, contents);
  return file;
}

// What `pg` actually resolves at connect time, which is not the same as the config we hand it:
// ConnectionParameters lets the connection string override explicit options.
function effectiveSsl(connectionString: string, env: Record<string, string | undefined>): unknown {
  const client = new Client(poolConfigFrom(connectionString, env));
  return (client as unknown as { connectionParameters: { ssl: unknown } }).connectionParameters.ssl;
}

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
    const options = sslOptionsFrom({ DATABASE_CA_CERT_PATH: FAKE_CA });
    expect(options?.rejectUnauthorized).toBe(true);
    expect(options?.ca).toContain("BEGIN CERTIFICATE");
  });

  it("throws immediately when the CA path is set but unreadable", () => {
    expect(() => sslOptionsFrom({ DATABASE_CA_CERT_PATH: "no/such/ca.pem" })).toThrow(/DATABASE_CA_CERT_PATH/);
  });

  // A truncated download leaves a zero-byte file. fs.readFileSync succeeds, and Node's TLS treats
  // an empty `ca` as "use the public root store", where Amazon's RDS CA is absent - so the site
  // would come up and render an empty project list instead of failing.
  it("throws when the CA file is empty", () => {
    const empty = writeScratch("empty.pem", "");
    expect(() => sslOptionsFrom({ DATABASE_CA_CERT_PATH: empty })).toThrow(/does not contain a certificate/);
  });

  it("throws when the CA file holds something that is not a certificate", () => {
    const html = writeScratch("notacert.pem", "<html><body>404 Not Found</body></html>\n");
    expect(() => sslOptionsFrom({ DATABASE_CA_CERT_PATH: html })).toThrow(/does not contain a certificate/);
  });
});

// These assert what `pg` resolves, not what we hand it. pg's ConnectionParameters applies
// `parse(connectionString)` OVER the explicit config, so a URL carrying sslmode/sslrootcert
// silently replaces the CA and drops rejectUnauthorized unless those params are removed first.
describe("TLS actually reaching the connection", () => {
  it("leaves ssl off for local development", () => {
    expect(effectiveSsl(UNREACHABLE, {})).toBeFalsy();
  });

  it("keeps our CA and verification when the URL also carries verify-full and a root cert", () => {
    const url = `${UNREACHABLE}?sslmode=verify-full&sslrootcert=${FAKE_CA}`;
    const ssl = effectiveSsl(url, { DATABASE_CA_CERT_PATH: FAKE_CA }) as { ca?: string; rejectUnauthorized?: boolean };
    expect(ssl.ca).toBe(FAKE_CA_CONTENTS);
    expect(ssl.rejectUnauthorized).toBe(true);
  });

  it("keeps our CA when the URL says only sslmode=require", () => {
    const ssl = effectiveSsl(`${UNREACHABLE}?sslmode=require`, { DATABASE_CA_CERT_PATH: FAKE_CA }) as {
      ca?: string;
      rejectUnauthorized?: boolean;
    };
    expect(ssl.ca).toBe(FAKE_CA_CONTENTS);
    expect(ssl.rejectUnauthorized).toBe(true);
  });

  it("does not let sslmode=disable in the URL turn TLS off when a CA is configured", () => {
    const ssl = effectiveSsl(`${UNREACHABLE}?sslmode=disable`, { DATABASE_CA_CERT_PATH: FAKE_CA }) as {
      ca?: string;
    };
    expect(ssl).not.toBe(false);
    expect(ssl.ca).toBe(FAKE_CA_CONTENTS);
  });

  it("leaves the URL's own TLS settings alone when no CA path is configured", () => {
    const url = `${UNREACHABLE}?sslmode=verify-full&sslrootcert=${FAKE_CA}`;
    const ssl = effectiveSsl(url, {}) as { ca?: string };
    expect(ssl.ca).toBe(FAKE_CA_CONTENTS);
  });

  it("preserves non-TLS query parameters", () => {
    const config = poolConfigFrom(`${UNREACHABLE}?sslmode=require&application_name=portfolio`, {
      DATABASE_CA_CERT_PATH: FAKE_CA,
    });
    expect(config.connectionString).toContain("application_name=portfolio");
    expect(config.connectionString).not.toContain("sslmode");
  });
});
