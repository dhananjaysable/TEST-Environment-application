import http from 'node:http';
import { fileURLToPath } from 'node:url';

export function createServer() {
  const APP_ENV = process.env.APP_ENV || 'development';
  const COMMIT_SHA = process.env.COMMIT_SHA || 'local-dev';
  const DATABASE_URL = process.env.DATABASE_URL ? 'CONFIGURED' : 'UNSET';

  return http.createServer((req, res) => {
    const url = new URL(req.url, `http://${req.headers.host}`);

    if (url.pathname === '/health' || url.pathname === '/') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      return res.end(
        JSON.stringify({
          status: 'UP',
          environment: APP_ENV,
          version: process.env.npm_package_version || '1.0.0',
          commitSha: COMMIT_SHA,
          database: DATABASE_URL,
          timestamp: new Date().toISOString()
        }, null, 2)
      );
    }

    if (url.pathname === '/api/info') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      return res.end(
        JSON.stringify({
          application: 'Enterprise Multi-Environment Service',
          environment: APP_ENV,
          features: {
            debugLogs: APP_ENV === 'development',
            strictAudit: APP_ENV === 'production',
            stagingMocks: APP_ENV === 'qa'
          }
        }, null, 2)
      );
    }

    res.writeHead(404, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Not Found' }));
  });
}

// Only start listening directly if run as main script
const isMain = process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1];
if (isMain) {
  const PORT = process.env.PORT || 8080;
  const APP_ENV = process.env.APP_ENV || 'development';
  const app = createServer();
  app.listen(PORT, () => {
    console.log(`🚀 [${APP_ENV.toUpperCase()}] Server running on http://localhost:${PORT}`);
  });
}
