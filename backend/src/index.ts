import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import shopifyRoutes from "./routes/shopifyRoutes";
import imageRoutes from "./routes/imageRoutes";
import subscriptionRoutes from "./routes/subscriptionRoutes";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Enable CORS for frontend Next.js app
app.use(
  cors({
    origin: [
      "http://localhost:3000",
      "http://127.0.0.1:3000",
      "https://thelocalbaba.com",
      "https://www.thelocalbaba.com",
      /^https:\/\/local-baba-[a-z0-9-]+\.vercel\.app$/,
      /^https:\/\/local-baba-.*-uzairhassan375s-projects\.vercel\.app$/,
    ],
    credentials: true,
  })
);

app.use(express.json({ limit: "20mb" }));
app.use(express.urlencoded({ extended: true, limit: "20mb" }));

// Health check endpoint
app.get("/api/health", (_req, res) => {
  res.json({
    status: "ok",
    service: "Local Baba Shopify Integration Backend",
    timestamp: new Date().toISOString(),
  });
});

// Register Shopify integration API routes
app.use("/api/shopify", shopifyRoutes);

// Register image search API routes (SerpApi)
app.use("/api/images", imageRoutes);

// Register subscription management API routes
app.use("/api/subscriptions", subscriptionRoutes);

app.listen(PORT, () => {
  console.log(`====================================================`);
  console.log(`🚀 Local Baba Backend Server running on port ${PORT}`);
  console.log(`🔗 Shopify API Endpoint: http://localhost:${PORT}/api/shopify`);
  console.log(`====================================================`);
});
