import { Router, type Request, type Response } from "express";
import { promises as fs } from "fs";
import path from "path";
import { fileURLToPath } from "url";

const feedbackRouter = Router();

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const FEEDBACK_DIR = path.resolve(__dirname, "../data/feedback");
const FEEDBACK_LOG = path.join(FEEDBACK_DIR, "feedback-log.json");

feedbackRouter.post("/feedback", async (req: Request, res: Response) => {
  const { recommendationId, issueInput, vote, confidence, timestamp } = req.body ?? {};

  if (
    typeof recommendationId !== "string" || recommendationId.length < 1 || recommendationId.length > 200 ||
    typeof issueInput !== "string" || issueInput.length < 1 || issueInput.length > 2000 ||
    (vote !== "up" && vote !== "down") ||
    typeof confidence !== "number" || confidence < 0 || confidence > 100 ||
    typeof timestamp !== "number" || timestamp <= 0
  ) {
    res.status(400).json({ error: "Invalid feedback payload" });
    return;
  }

  const entry = { recommendationId, issueInput, vote, confidence, timestamp };

  try {
    await fs.mkdir(FEEDBACK_DIR, { recursive: true });
    // Append as newline-delimited JSON — one entry per line, safe for concurrent writes
    await fs.appendFile(FEEDBACK_LOG, JSON.stringify(entry) + "\n", "utf8");
    req.log?.info({ recommendationId, vote }, "Feedback received");
    res.json({ ok: true });
  } catch (err) {
    req.log?.error(err, "Failed to write feedback");
    res.status(500).json({ error: "Failed to save feedback" });
  }
});

export default feedbackRouter;
