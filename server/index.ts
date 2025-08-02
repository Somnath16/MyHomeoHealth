import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import { config, validateConfig } from "./config";

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      log(logLine);
    }
  });

  next();
});

(async () => {
  // Validate environment configuration
  try {
    validateConfig();
    log(`Starting server in ${config.isDevelopment ? 'development' : 'production'} mode`);
  } catch (error: any) {
    log(`Configuration error: ${error.message}`, "error");
    process.exit(1);
  }

  const server = await registerRoutes(app);

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    res.status(status).json({ message });
    throw err;
  });

  // Setup serving based on environment
  if (config.isDevelopment) {
    log("Setting up Vite development server with HMR");
    await setupVite(app, server);
  } else {
    log("Setting up static file serving for production");
    serveStatic(app);
  }

  // Start server with environment-specific configuration
  server.listen({
    port: config.port,
    host: config.host,
    reusePort: true,
  }, () => {
    log(`Server running on ${config.host}:${config.port}`);
    log(`Environment: ${config.isDevelopment ? 'development' : 'production'}`);
    log(`Database: ${config.database.url?.includes('localhost') ? 'local' : 'remote'}`);
  });
})();
