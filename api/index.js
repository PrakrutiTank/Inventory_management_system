import { connectDB } from "../server/db.js";
import app from "../server/server.js";

export default async function handler(req, res) {
  await connectDB();
  return app(req, res);
}
