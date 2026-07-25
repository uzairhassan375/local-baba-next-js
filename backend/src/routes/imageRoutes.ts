import { Router, Request, Response } from "express";
import { searchProductImages } from "../services/serpService";

const router = Router();

/**
 * POST /api/images/search
 * Body: { imageUrl?: string, productName?: string, limit?: number }
 * Returns: { success: boolean, images: SerpImage[], count: number }
 */
router.post("/search", async (req: Request, res: Response) => {
  const { imageUrl, productName, limit: rawLimit } = req.body as {
    imageUrl?: string;
    productName?: string;
    limit?: number;
  };

  const limit = Math.max(9, Math.min(11, Number(rawLimit) || 10));

  if (!imageUrl && !productName) {
    return res.status(400).json({
      success: false,
      error: "Provide at least one of: imageUrl or productName.",
    });
  }

  try {
    const images = await searchProductImages(imageUrl, productName, limit);

    return res.json({
      success: true,
      source: "SerpApi via Local Baba Backend",
      count: images.length,
      images,
    });
  } catch (err: any) {
    console.error("[ImageRoutes] search error:", err);
    return res.status(500).json({
      success: false,
      error: err.message || "Image search failed.",
    });
  }
});

export default router;
