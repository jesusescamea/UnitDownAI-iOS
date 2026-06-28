import { Router, type Request, type Response } from "express";
import { promises as fs } from "fs";
import path from "path";
import { fileURLToPath } from "url";

const resolutionRouter = Router();

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const FEEDBACK_DIR = path.resolve(__dirname, "../data/feedback");
const RESOLUTION_LOG = path.join(FEEDBACK_DIR, "resolution-log.json");

resolutionRouter.post("/resolution", async (req: Request, res: Response) => {
  const { issueInput, resolved, timestamp } = req.body ?? {};

  if (
    typeof issueInput !== "string" || issueInput.length < 1 || issueInput.length > 2000 ||
    typeof resolved !== "boolean" ||
    typeof timestamp !== "number" || timestamp <= 0
  ) {
    res.status(400).json({ error: "Invalid resolution payload" });
    return;
  }

  let entry: Record<string, unknown>;

  if (resolved) {
    const { selectedRecommendationId, selectedRecommendationTitle } = req.body;
    if (
      typeof selectedRecommendationId !== "string" || selectedRecommendationId.length < 1 ||
      typeof selectedRecommendationTitle !== "string"
    ) {
      res.status(400).json({ error: "Invalid resolved payload" });
      return;
    }
    entry = { issueInput, resolved: true, selectedRecommendationId, selectedRecommendationTitle, timestamp };
  } else {
    const { actualFix, notes } = req.body;
    if (typeof actualFix !== "string" || actualFix.trim().length < 1 || actualFix.length > 2000) {
      res.status(400).json({ error: "Invalid unresolved payload" });
      return;
    }
    entry = {
      issueInput,
      resolved: false,
      actualFix: actualFix.trim(),
      notes: typeof notes === "string" ? notes.trim() : "",
      timestamp,
    };
  }

  try {
    await fs.mkdir(FEEDBACK_DIR, { recursive: true });
    await fs.appendFile(RESOLUTION_LOG, JSON.stringify(entry) + "\n", "utf8");
    req.log?.info({ resolved, issueInput: issueInput.slice(0, 60) }, "Resolution feedback received");
    res.json({ ok: true });
  } catch (err) {
    req.log?.error(err, "Failed to write resolution feedback");
    res.status(500).json({ error: "Failed to save resolution feedback" });
  }
});

export default resolutionRouter;
