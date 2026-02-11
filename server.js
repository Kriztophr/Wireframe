// Custom Next.js server with extended timeout for video generation
// Node.js default server.requestTimeout is 5 minutes (300,000ms)
// We extend it to 10 minutes for long-running fal.ai video generation

const express = require('express');
const next = require('next');
const helmet = require('helmet');
const compression = require('compression');
const rateLimit = require('express-rate-limit');

const dev = process.env.NODE_ENV !== 'production';
const hostname = process.env.HOST || '0.0.0.0';
const port = process.env.PORT || 3000;

const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

app.prepare().then(() => {
  const server = express();

  // Trust proxy so we can respect X-Forwarded-* headers (useful behind load balancers)
  server.set('trust proxy', 1);

  // Security headers
  server.use(
    helmet({
      // Keep a conservative CSP; adjust as needed for allowed endpoints
      contentSecurityPolicy: dev
        ? false
        : {
            directives: {
              defaultSrc: ["'self'"],
              scriptSrc: ["'self'", "'unsafe-inline'"],
              styleSrc: ["'self'", "'unsafe-inline'"],
              imgSrc: ["'self'", 'data:', 'https:'],
              connectSrc: ["'self'", 'https:'],
            },
          },
    })
  );

  // Enable gzip/deflate compression for responses
  server.use(compression());

  // Basic rate limiting to prevent abuse (adjust window/max to your needs)
  const limiter = rateLimit({
    windowMs: 1 * 60 * 1000, // 1 minute
    max: 120, // limit each IP to 120 requests per windowMs
    standardHeaders: true,
    legacyHeaders: false,
  });
  server.use(limiter);

  // Enforce HTTPS when not in dev behind a proxy
  server.use((req, res, next) => {
    if (!dev && req.headers['x-forwarded-proto'] && req.headers['x-forwarded-proto'] !== 'https') {
      return res.redirect(301, `https://${req.headers.host}${req.originalUrl}`);
    }
    next();
  });

  // Cache static Next assets aggressively
  server.use((req, res, next) => {
    if (req.url.startsWith('/_next/static') || req.url.startsWith('/static') || req.url.startsWith('/public')) {
      res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
    }
    next();
  });

  // Route all requests through Next's request handler
  server.all('*', (req, res) => handle(req, res));

  const httpServer = server.listen(port, hostname, () => {
    console.log(`> Ready on http://${hostname}:${port}`);
  });

  // Increase server timeouts for long-running requests (video generation)
  httpServer.requestTimeout = 600000; // 10 minutes
  httpServer.headersTimeout = 610000; // Slightly longer than requestTimeout
});
