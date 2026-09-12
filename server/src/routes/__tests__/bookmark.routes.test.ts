import request from "supertest";
import app from "../../app";
import { Bookmark } from "../../models/bookmark.model";
import { signJWT } from "../../services/auth.service";

jest.mock("../../models/bookmark.model", () => ({
  __esModule: true,
  Bookmark: {
    find: jest.fn(),
    findOneAndUpdate: jest.fn(),
    findOneAndDelete: jest.fn(),
  },
}));

const token = signJWT({ userId: "user123", email: "user@example.com" });

describe("bookmark routes", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("GET /bookmarks", () => {
    it("returns 401 with no Authorization header", async () => {
      const res = await request(app).get("/bookmarks");
      expect(res.status).toBe(401);
    });

    it("returns the user's bookmarks sorted by newest first", async () => {
      const sortMock = jest.fn().mockResolvedValue([{ tweetId: "1" }]);
      (Bookmark.find as jest.Mock).mockReturnValue({ sort: sortMock });

      const res = await request(app)
        .get("/bookmarks")
        .set("Authorization", `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body).toEqual({ code: 0, bookmarks: [{ tweetId: "1" }] });
      expect(Bookmark.find).toHaveBeenCalledWith({ user: "user123" });
      expect(sortMock).toHaveBeenCalledWith({ createdAt: -1 });
    });

    it("returns 500 when the lookup fails", async () => {
      (Bookmark.find as jest.Mock).mockReturnValue({
        sort: jest.fn().mockRejectedValue(new Error("db down")),
      });

      const res = await request(app)
        .get("/bookmarks")
        .set("Authorization", `Bearer ${token}`);

      expect(res.status).toBe(500);
      expect(res.body).toEqual({
        code: 1,
        message: "Error fetching bookmarks",
      });
    });
  });

  describe("POST /bookmarks", () => {
    it("returns 401 with no Authorization header", async () => {
      const res = await request(app).post("/bookmarks").send({});
      expect(res.status).toBe(401);
    });

    it("returns 400 when tweetId or link is missing", async () => {
      const res = await request(app)
        .post("/bookmarks")
        .set("Authorization", `Bearer ${token}`)
        .send({ tweetId: "1" });

      expect(res.status).toBe(400);
      expect(res.body).toEqual({
        code: 1,
        message: "tweetId and link are required",
      });
    });

    it("upserts the bookmark and returns it", async () => {
      const savedBookmark = {
        user: "user123",
        tweetId: "1",
        link: "https://x.com/1",
        username: "alice",
      };
      (Bookmark.findOneAndUpdate as jest.Mock).mockResolvedValue(
        savedBookmark
      );

      const res = await request(app)
        .post("/bookmarks")
        .set("Authorization", `Bearer ${token}`)
        .send({ tweetId: "1", link: "https://x.com/1", username: "alice" });

      expect(res.status).toBe(200);
      expect(res.body).toEqual({ code: 0, bookmark: savedBookmark });
      expect(Bookmark.findOneAndUpdate).toHaveBeenCalledWith(
        { user: "user123", tweetId: "1" },
        {
          user: "user123",
          tweetId: "1",
          link: "https://x.com/1",
          username: "alice",
        },
        { upsert: true, new: true, setDefaultsOnInsert: true }
      );
    });

    it("returns 500 when saving fails", async () => {
      (Bookmark.findOneAndUpdate as jest.Mock).mockRejectedValue(
        new Error("db down")
      );

      const res = await request(app)
        .post("/bookmarks")
        .set("Authorization", `Bearer ${token}`)
        .send({ tweetId: "1", link: "https://x.com/1" });

      expect(res.status).toBe(500);
      expect(res.body).toEqual({ code: 1, message: "Error saving bookmark" });
    });
  });

  describe("DELETE /bookmarks/:tweetId", () => {
    it("returns 401 with no Authorization header", async () => {
      const res = await request(app).delete("/bookmarks/1");
      expect(res.status).toBe(401);
    });

    it("removes the bookmark and returns 200", async () => {
      (Bookmark.findOneAndDelete as jest.Mock).mockResolvedValue({});

      const res = await request(app)
        .delete("/bookmarks/1")
        .set("Authorization", `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body).toEqual({ code: 0, message: "Bookmark removed" });
      expect(Bookmark.findOneAndDelete).toHaveBeenCalledWith({
        user: "user123",
        tweetId: "1",
      });
    });

    it("returns 500 when deletion fails", async () => {
      (Bookmark.findOneAndDelete as jest.Mock).mockRejectedValue(
        new Error("db down")
      );

      const res = await request(app)
        .delete("/bookmarks/1")
        .set("Authorization", `Bearer ${token}`);

      expect(res.status).toBe(500);
      expect(res.body).toEqual({
        code: 1,
        message: "Error removing bookmark",
      });
    });
  });
});
