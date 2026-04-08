import Fastify from "fastify";
import cors from "@fastify/cors";
import multipart from "@fastify/multipart";
import { subjectRoutes } from "./routes/subjects.js";
import { lessonRoutes } from "./routes/lessons.js";
import { questionRoutes } from "./routes/questions.js";
import { adminRoutes } from "./routes/admin.js";
import { authRoutes } from "./routes/auth.js";
import { paperRoutes } from "./routes/papers.js";
import { paperAttemptRoutes } from "./routes/paperAttempts.js";
import { paperAdminRoutes } from "./routes/paperAdmin.js";
import { contentRoutes } from "./routes/content.js";
import { adminResourceRoutes } from "./routes/adminResources.js";

const app = Fastify({ logger: true });

const start = async () => {
  try {
    await app.register(cors, { origin: true });

    // Multipart needed for file uploads (admin question upload)
    await app.register(multipart, {
      limits: { fileSize: 20 * 1024 * 1024 }, // 20 MB
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
    await app.register(paperAttemptRoutes);
    await app.register(paperAdminRoutes);
    await app.register(contentRoutes);
    await app.register(adminResourceRoutes);

    await app.listen({ port: 4000, host: "0.0.0.0" });
    console.log("API running on http://localhost:4000");
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
};

start();
