import { Router, type Request, type Response } from "express";
import {
  matchModelFamily,
  UNIVERSAL_RESOURCES,
  type FamilyMatch,
} from "../data/equipmentResources";

const resourcesRouter = Router();

/**
 * GET /api/resources
 * Query params:
 *   model        — model number (e.g. LGH092H4BM1G)
 *   manufacturer — manufacturer name (e.g. Lennox)  [optional, used as fallback]
 *
 * Returns matching model family + all resources for that family,
 * plus universal resources (AHRI, EPA) always appended at the end.
 *
 * Response shape:
 * {
 *   match: { familyId, manufacturer, series, description, matchType, matchedPrefix, coversModels } | null,
 *   resources: EquipmentResource[],
 *   universalResources: EquipmentResource[],
 *   totalResources: number,
 * }
 */
resourcesRouter.get("/resources", (req: Request, res: Response) => {
  const model = (req.query.model as string | undefined)?.trim() || null;
  const manufacturer = (req.query.manufacturer as string | undefined)?.trim() || null;

  if (!model && !manufacturer) {
    res.status(400).json({ error: "At least one of 'model' or 'manufacturer' is required" });
    return;
  }

  const matchResult: FamilyMatch | null = matchModelFamily(model, manufacturer);

  const familyResources = matchResult?.family.resources ?? [];
  const totalResources = familyResources.length + UNIVERSAL_RESOURCES.length;

  req.log?.info(
    {
      model,
      manufacturer,
      matchType: matchResult?.matchType ?? "none",
      matchedPrefix: matchResult?.matchedPrefix,
      familyId: matchResult?.family.id,
      resourceCount: totalResources,
    },
    "Equipment resources lookup",
  );

  res.json({
    match: matchResult
      ? {
          familyId: matchResult.family.id,
          manufacturer: matchResult.family.manufacturer,
          series: matchResult.family.series,
          description: matchResult.family.description,
          matchType: matchResult.matchType,
          matchedPrefix: matchResult.matchedPrefix,
          coversModels: matchResult.family.coversModels ?? null,
        }
      : null,
    resources: familyResources,
    universalResources: UNIVERSAL_RESOURCES,
    totalResources,
  });
});

export default resourcesRouter;
