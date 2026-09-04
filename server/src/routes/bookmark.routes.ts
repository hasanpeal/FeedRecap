import express from "express";
import { Bookmark } from "../models/bookmark.model";
import { authenticateJWT } from "../middleware/auth.middleware";

const router = express.Router();

// Get all bookmarks for the logged-in user, newest first
router.get("/bookmarks", authenticateJWT, async (req, res) => {
  try {
    const userFromToken = req.user!;

    const bookmarks = await Bookmark.find({ user: userFromToken.id }).sort({
      createdAt: -1,
    });

    res.status(200).json({ code: 0, bookmarks });
  } catch (error) {
    console.error("[Bookmark] Error fetching bookmarks:", error);
    res.status(500).json({ code: 1, message: "Error fetching bookmarks" });
  }
});

// Save a bookmark (just the tweet link, since posts get deleted after 7 days)
router.post("/bookmarks", authenticateJWT, async (req, res) => {
  try {
    const userFromToken = req.user!;
    const { tweetId, link, username } = req.body;

    if (!tweetId || !link) {
      return res
        .status(400)
        .json({ code: 1, message: "tweetId and link are required" });
    }

    const bookmark = await Bookmark.findOneAndUpdate(
      { user: userFromToken.id, tweetId },
      { user: userFromToken.id, tweetId, link, username },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    res.status(200).json({ code: 0, bookmark });
  } catch (error) {
    console.error("[Bookmark] Error saving bookmark:", error);
    res.status(500).json({ code: 1, message: "Error saving bookmark" });
  }
});

// Remove a bookmark
router.delete("/bookmarks/:tweetId", authenticateJWT, async (req, res) => {
  try {
    const userFromToken = req.user!;
    const { tweetId } = req.params;

    await Bookmark.findOneAndDelete({ user: userFromToken.id, tweetId });

    res.status(200).json({ code: 0, message: "Bookmark removed" });
  } catch (error) {
    console.error("[Bookmark] Error removing bookmark:", error);
    res.status(500).json({ code: 1, message: "Error removing bookmark" });
  }
});

export default router;
