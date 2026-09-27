// Newline-delimited stdio MCP → first-party Streamable HTTP JSON bridge.
// It is spawned only for an HQ-managed Pi instance. The device-scoped bearer
// stays in this child environment and is never written into Pi settings.
import { createInterface } from "node:readline";

const url = process.env.OMB_REMOTE_MCP_URL;
const token = process.env.OMB_REMOTE_MCP_TOKEN;
const MAX_FRAME_BYTES = 32 * 1024 * 1024;

if (!url || !token) process.exit(2);
const endpoint = new URL(url);
if (endpoint.protocol !== "https:" && !(endpoint.protocol === "http:" && ["127.0.0.1", "localhost", "[::1]"].includes(endpoint.hostname))) process.exit(2);

const lines = createInterface({ input: process.stdin, crlfDelay: Infinity });
lines.on("line", line => {
  if (!line.trim()) return;
  if (Buffer.byteLength(line, "utf8") > MAX_FRAME_BYTES) process.exit(3);
  void (async () => {
    let body: unknown;
    try { body = JSON.parse(line); } catch { return; }
    try {
      const response = await fetch(endpoint, {
        method: "POST", redirect: "error", cache: "no-store",
        headers: { accept: "application/json", "content-type": "application/json", authorization: `Bearer ${token}` },
        body: JSON.stringify(body), signal: AbortSignal.timeout(10 * 60_000),
      });
      if (response.status === 202 || response.status === 204) return;
      const text = await response.text();
      if (!response.ok || Buffer.byteLength(text, "utf8") > MAX_FRAME_BYTES) throw new Error("remote MCP request failed");
      JSON.parse(text);
      process.stdout.write(`${text}\n`);
    } catch {
      const id = body && typeof body === "object" && !Array.isArray(body) ? (body as { id?: unknown }).id : null;
      if (id !== undefined && id !== null) process.stdout.write(`${JSON.stringify({ jsonrpc: "2.0", id, error: { code: -32000, message: "Aiwah CRM is temporarily unavailable." } })}\n`);
    }
  })();
});
