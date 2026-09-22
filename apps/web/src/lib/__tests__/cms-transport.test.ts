import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// astro:env/server is aliased to src/__mocks__/astro-env-server.ts in
// vitest.config.ts. Each case re-mocks it to set CMS_TRANSPORT, then imports
// the module fresh so the top-level `usesDirect` is recomputed.
async function loadTransport(mode: string, ci: string | undefined) {
  vi.resetModules();
  vi.doMock("astro:env/server", () => ({
    DIRECTUS_TOKEN: "stub-token",
    DIRECTUS_URL: "http://directus.test",
    INTERNAL_URL: "http://site.test",
    CMS_TRANSPORT: mode,
  }));
  if (ci === undefined) delete process.env.CI;
  else process.env.CI = ci;
  return import("../cms-transport");
}

const originalCI = process.env.CI;

describe("cmsTarget", () => {
  beforeEach(() => {
    delete process.env.CI;
  });

  afterEach(() => {
    vi.doUnmock("astro:env/server");
    if (originalCI === undefined) delete process.env.CI;
    else process.env.CI = originalCI;
  });

  it("auto serves requests through the proxy", async () => {
    const { cmsTarget, usesDirect } = await loadTransport("auto", undefined);
    expect(usesDirect).toBe(false);
    expect(cmsTarget("/items/guests")).toEqual({
      url: "http://site.test/api/cms/items/guests",
      headers: {},
    });
  });

  it("auto goes direct during a build (CI=1)", async () => {
    const { cmsTarget, usesDirect } = await loadTransport("auto", "1");
    expect(usesDirect).toBe(true);
    expect(cmsTarget("/items/guests")).toEqual({
      url: "http://directus.test/items/guests",
      headers: { Authorization: "Bearer stub-token" },
    });
  });

  it("direct ignores the proxy even when serving requests", async () => {
    const { cmsTarget } = await loadTransport("direct", undefined);
    expect(cmsTarget("/items/guests").url).toBe(
      "http://directus.test/items/guests",
    );
  });

  it("proxy stays on the proxy even during a build", async () => {
    const { cmsTarget } = await loadTransport("proxy", "1");
    expect(cmsTarget("/items/guests").url).toBe(
      "http://site.test/api/cms/items/guests",
    );
  });

  it("mutations carry the internal key on the proxy, bearer when direct", async () => {
    const proxied = await loadTransport("proxy", undefined);
    expect(proxied.cmsTarget("/items/guests/1", true).headers).toEqual({
      "X-Internal-Key": "stub-token",
    });

    const direct = await loadTransport("direct", undefined);
    expect(direct.cmsTarget("/items/guests/1", true).headers).toEqual({
      Authorization: "Bearer stub-token",
    });
  });
});
