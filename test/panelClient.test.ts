import { describe, it, expect, vi, beforeEach } from "vitest";

const fetchMock = vi.fn();
vi.mock("undici", () => ({ Agent: class {}, fetch: (...args: unknown[]) => fetchMock(...args) }));

const { PanelClient } = await import("../src/client/panelClient.js");

const json = (body: unknown) => new Response(JSON.stringify(body), { status: 200 });
const calledPaths = () => fetchMock.mock.calls.map(([url]) => new URL(String(url)).pathname);

function client(flavor: "pterodactyl" | "hydrodactyl") {
  return new PanelClient({ name: "p", baseUrl: "https://panel.test", clientApiKey: "k", applicationApiKey: "a", timeoutMs: 1000, flavor });
}

describe("PanelClient path handling", () => {
  beforeEach(() => fetchMock.mockReset());

  it("leaves pterodactyl paths alone", async () => {
    fetchMock.mockImplementation(async () => json({}));
    await client("pterodactyl").request("/servers/abc/files/list", { surface: "client" });
    expect(calledPaths()).toEqual(["/api/client/servers/abc/files/list"]);
  });

  it("rewrites hydrodactyl server routes under the daemon type, caching the lookup", async () => {
    fetchMock.mockImplementation(async () => json({ attributes: { daemon_type: "elytra" }, meta: { daemonType: "elytra" } }));
    const c = client("hydrodactyl");
    await c.request("/servers/abc/files/list", { surface: "client" });
    await c.request("/servers/abc/backups", { surface: "client" });
    expect(calledPaths()).toEqual([
      "/api/client/servers/abc",
      "/api/client/servers/elytra/abc/files/list",
      "/api/client/servers/elytra/abc/backups",
    ]);
  });

  it("keeps hydrodactyl top-level routes and non-server paths unrewritten", async () => {
    fetchMock.mockImplementation(async () => json({}));
    const c = client("hydrodactyl");
    for (const p of ["/servers/abc", "/servers/abc/resources/history", "/servers/abc/marketplace/search", "/servers/abc/subdomain", "/account"]) {
      await c.request(p, { surface: "client" });
    }
    await c.request("/servers/1/startup", { surface: "application" });
    expect(calledPaths()).toEqual([
      "/api/client/servers/abc",
      "/api/client/servers/abc/resources/history",
      "/api/client/servers/abc/marketplace/search",
      "/api/client/servers/abc/subdomain",
      "/api/client/account",
      "/api/application/servers/1/startup",
    ]);
  });
});
