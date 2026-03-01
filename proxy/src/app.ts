import Fastify, { type FastifyInstance } from "fastify";
import { resolveTimeoutMs, resolveUpstreamUrls } from "./config.js";

type FetchLike = typeof fetch;

type BuildAppOptions = {
  fetchImpl?: FetchLike;
  upstreamUrls?: string[];
  timeoutMs?: number;
};

type JsonRpcRequest = {
  jsonrpc?: string;
  method?: string;
  params?: unknown;
  id?: unknown;
};

function isJsonRpcRequest(payload: unknown): payload is JsonRpcRequest {
  if (!payload || typeof payload !== "object") {
    return false;
  }

  const value = payload as Record<string, unknown>;
  return typeof value.method === "string";
}

export function buildApp(options: BuildAppOptions = {}): FastifyInstance {
  const app = Fastify({ logger: true });
  const fetchImpl = options.fetchImpl ?? fetch;
  const upstreamUrls = options.upstreamUrls ?? resolveUpstreamUrls();
  const timeoutMs = options.timeoutMs ?? resolveTimeoutMs();

  app.get("/health", async () => ({
    ok: true,
    upstreams: upstreamUrls.length
  }));

  app.post("/", async (request, reply) => {
    const payload = request.body;

    if (!isJsonRpcRequest(payload)) {
      return reply.code(400).send({
        jsonrpc: "2.0",
        id: null,
        error: {
          code: -32600,
          message: "Invalid JSON-RPC request"
        }
      });
    }

    const method = payload.method;
    const sanitizedHeaders: HeadersInit = {
      "content-type": "application/json",
      "user-agent": "private-rpc-proxy/0.1"
    };

    const errors: string[] = [];

    for (const upstreamUrl of upstreamUrls) {
      try {
        request.log.info({ method, upstreamUrl }, "Forwarding RPC request");

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

        const upstreamResponse = await fetchImpl(upstreamUrl, {
          method: "POST",
          headers: sanitizedHeaders,
          body: JSON.stringify(payload),
          signal: controller.signal
        });

        clearTimeout(timeoutId);

        if (!upstreamResponse.ok) {
          throw new Error(`Upstream HTTP ${upstreamResponse.status}`);
        }

        const json = await upstreamResponse.json();
        return reply.code(200).send(json);
      } catch (error) {
        const reason = error instanceof Error ? error.message : String(error);
        errors.push(`${upstreamUrl}: ${reason}`);
      }
    }

    request.log.error({ method, errors }, "All upstream RPC endpoints failed");

    return reply.code(502).send({
      jsonrpc: "2.0",
      id: payload.id ?? null,
      error: {
        code: -32000,
        message: "All upstream RPC endpoints failed"
      }
    });
  });

  return app;
}
