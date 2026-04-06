import Fastify from "fastify";
import cors from "@fastify/cors";
import multipart from "@fastify/multipart";
import { subjectRoutes } from "./routes/subjects.js";
import { lessonRoutes } from "./routes/lessons.js";
import { questionRoutes } from "./routes/questions.js";
import { adminRoutes } from "./routes/admin.js";
import { authRoutes } from "./routes/auth.js";
import { paperRoutes } from "./routes/papers.js";
import { contentRoutes } from "./routes/content.js";

const app = Fastify({ logger: true });

const start = async () => {
  try {
    await app.register(cors, { origin: true });

    // Multipart needed for file uploads (admin question upload)
    await app.register(multipart, {
      limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB
    });

    app.get("/health", async () => {
      return { ok: true, service: "premayeso-api" };
    });

    await app.register(subjectRoutes);
    await app.register(lessonRoutes);
    await app.register(questionRoutes);
    await app.register(adminRoutes);
    await app.register(authRoutes);
    await app.register(paperRoutes);
    await app.register(contentRoutes);

    await app.listen({ port: 4000, host: "0.0.0.0" });
    console.log("API running on http://localhost:4000");
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
};

start();
