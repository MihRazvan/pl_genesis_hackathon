import { buildApp } from "./app.js";
import { resolvePort } from "./config.js";

async function startServer(): Promise<void> {
  const app = buildApp();
  const port = resolvePort();

  try {
    await app.listen({ port, host: "0.0.0.0" });
    app.log.info({ port }, "Cloakline proxy listening");
  } catch (error) {
    app.log.error(error, "Failed to start server");
    process.exit(1);
  }
}

void startServer();
