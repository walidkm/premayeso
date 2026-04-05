import Fastify from "fastify";
import cors from "@fastify/cors";

const app = Fastify({ logger: true });

const start = async () => {
  try {
    await app.register(cors, { origin: true });

    app.get("/health", async () => {
      return { ok: true, service: "premayeso-api" };
    });

    await app.listen({ port: 4000, host: "0.0.0.0" });
    console.log("API running on http://localhost:4000");
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
};

start();
