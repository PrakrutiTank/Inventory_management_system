import { connectDB } from "../server/db.js";
import app from "../server/server.js";

export default async function handler(req, res) {
  // Normalize req.url so Express routes matching /api/* always resolve
  if (req.url && !req.url.startsWith("/api")) {
    req.url = "/api" + (req.url.startsWith("/") ? req.url : "/" + req.url);
  }

  // Handle health check route immediately
  if (req.url === "/api/health" || (req.url && req.url.endsWith("/health"))) {
    return app(req, res);
  }

  try {
    await connectDB();
  } catch (dbErr) {
    console.error("Vercel Serverless Function - Database Connection Error:", dbErr.message);
    return res.status(503).json({
      error: "Database Connection Failed: " + dbErr.message,
      hint: "Please ensure MONGO_URI is set in Vercel Project Settings (Settings -> Environment Variables) and MongoDB Atlas Network Access has IP 0.0.0.0/0 whitelisted."
    });
  }

  return app(req, res);
}
