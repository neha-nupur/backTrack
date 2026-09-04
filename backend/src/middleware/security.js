const helmet = require("helmet");
const cors = require("cors");
const rateLimit = require("express-rate-limit");
const env = require("../config/env");

const configureSecurity = (app, express) => {
  // Security Headers
  app.use(helmet());

  // CORS Configuration
  const allowedOrigins = [
    env.FRONTEND_URL,
    "http://localhost:5173",
    "http://127.0.0.1:5173",
  ].filter(Boolean);

  app.use(
    cors({
      origin: (origin, callback) => {
        // Allow requests with no origin (like mobile apps or curl) in development
        if (!origin || env.NODE_ENV === "development") {
          return callback(null, true);
        }
        if (allowedOrigins.includes(origin)) {
          return callback(null, true);
        }
        return callback(
          new Error("CORS policy does not allow access from this origin."),
        );
      },
      credentials: true,
      methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
      allowedHeaders: ["Content-Type", "Authorization"],
    }),
  );

  // Body Parser Limits (100kb default limit)
  app.use(express.json({ limit: "100kb" }));
  app.use(express.urlencoded({ extended: true, limit: "100kb" }));

  // General API Rate Limiter — Abuse / DDoS catch-all
  //
  // BackTrack is a live contest platform where 500+ participants may share a
  // single public IP (college / company Wi-Fi NAT). A conservative estimate:
  //   500 users × 200 requests/session = 100,000 requests per 15 minutes.
  //
  // This limit is therefore set to 100,000 per IP per 15 minutes. It will
  // never trigger for legitimate participant usage, but still prevents
  // genuine bot floods or runaway clients from hammering the server.
  //
  // Login endpoints are excluded so authentication is not limited by client IP.
  const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100_000,              // 1 lakh requests per IP per 15 min
    standardHeaders: true,     // Return RateLimit-* headers (RFC 6585)
    legacyHeaders: false,      // Disable legacy X-RateLimit-* headers
    skip: (req) =>
      req.path === "/auth/login" || req.path === "/auth/admin/login",
    message: {
      success: false,
      message:
        "Too many requests from this IP, please try again after 15 minutes",
      errorCode: "RATE_LIMIT_EXCEEDED",
    },
  });

  app.use("/api", apiLimiter);
};

module.exports = configureSecurity;
