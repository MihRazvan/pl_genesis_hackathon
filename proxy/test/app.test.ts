import { afterEach, describe, expect, it, vi } from "vitest";
import { buildApp } from "../src/app.js";

afterEach(() => {
  vi.restoreAllMocks();
});

describe("RPC proxy", () => {
  it("returns root status payload", async () => {
    const app = buildApp({ upstreamUrls: ["https://example-rpc.test"] });

    const response = await app.inject({ method: "GET", url: "/" });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({
      name: "Cloakline",
      ok: true,
      message: "Cloakline RPC is running. Use POST / for JSON-RPC and GET /health for status.",
      upstreams: 1
    });
    await app.close();
  });

  it("returns health status", async () => {
    const app = buildApp({ upstreamUrls: ["https://example-rpc.test"] });

    const response = await app.inject({ method: "GET", url: "/health" });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({ ok: true, upstreams: 1 });
    await app.close();
  });

  it("forwards a request to the first upstream", async () => {
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(
      new Response(JSON.stringify({ jsonrpc: "2.0", id: 1, result: "0xabc" }), {
        status: 200,
        headers: { "content-type": "application/json" }
      })
    );
    const queryLogger = { logRequest: vi.fn() };

    const app = buildApp({
      fetchImpl: fetchMock,
      upstreamUrls: ["https://first.example"],
      queryLogger
    });

    const response = await app.inject({
      method: "POST",
      url: "/",
      payload: { jsonrpc: "2.0", id: 1, method: "eth_blockNumber", params: [] }
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({ jsonrpc: "2.0", id: 1, result: "0xabc" });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock.mock.calls[0]?.[0]).toBe("https://first.example");
    expect(queryLogger.logRequest).toHaveBeenCalledTimes(1);
    await app.close();
  });

  it("falls back to second upstream when first fails", async () => {
    const fetchMock = vi
      .fn<typeof fetch>()
      .mockRejectedValueOnce(new Error("first unavailable"))
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ jsonrpc: "2.0", id: 2, result: "0xdef" }), {
          status: 200,
          headers: { "content-type": "application/json" }
        })
      );

    const app = buildApp({
      fetchImpl: fetchMock,
      upstreamUrls: ["https://first.example", "https://second.example"]
    });

    const response = await app.inject({
      method: "POST",
      url: "/",
      payload: { jsonrpc: "2.0", id: 2, method: "eth_getBalance", params: [] }
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({ jsonrpc: "2.0", id: 2, result: "0xdef" });
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(fetchMock.mock.calls[1]?.[0]).toBe("https://second.example");
    await app.close();
  });

  it("rejects invalid payloads", async () => {
    const app = buildApp({ upstreamUrls: ["https://first.example"] });

    const response = await app.inject({
      method: "POST",
      url: "/",
      payload: { hello: "world" }
    });

    expect(response.statusCode).toBe(400);
    expect(response.json().error.code).toBe(-32600);
    await app.close();
  });

  it("returns 502 when all upstreams fail", async () => {
    const fetchMock = vi.fn<typeof fetch>().mockRejectedValue(new Error("network down"));
    const queryLogger = { logRequest: vi.fn() };

    const app = buildApp({
      fetchImpl: fetchMock,
      upstreamUrls: ["https://first.example", "https://second.example"],
      queryLogger
    });

    const response = await app.inject({
      method: "POST",
      url: "/",
      payload: { jsonrpc: "2.0", id: 3, method: "eth_chainId", params: [] }
    });

    expect(response.statusCode).toBe(502);
    expect(response.json().error.code).toBe(-32000);
    expect(queryLogger.logRequest).not.toHaveBeenCalled();
    await app.close();
  });

  it("still returns upstream response when query logger throws synchronously", async () => {
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(
      new Response(JSON.stringify({ jsonrpc: "2.0", id: 4, result: "0x1" }), {
        status: 200,
        headers: { "content-type": "application/json" }
      })
    );
    const queryLogger = {
      logRequest: vi.fn(() => {
        throw new Error("logger boom");
      })
    };

    const app = buildApp({
      fetchImpl: fetchMock,
      upstreamUrls: ["https://first.example"],
      queryLogger
    });

    const response = await app.inject({
      method: "POST",
      url: "/",
      payload: { jsonrpc: "2.0", id: 4, method: "eth_blockNumber", params: [] }
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({ jsonrpc: "2.0", id: 4, result: "0x1" });
    expect(queryLogger.logRequest).toHaveBeenCalledTimes(1);
    await app.close();
  });
});
