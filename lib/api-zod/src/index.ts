export * from "./generated/api";
export type {
  HvacDiagnosisResult,
  HvacDiagnosisEntry,
  HvacDiagnosisEntryPriorityLevel,
  HealthStatus,
  // Voice Intelligence types (VoiceInterpretBody is a Zod const — exported above via generated/api)
  VoiceInterpretResult,
  VoiceMemoryExtracts,
  VoiceUncertainPhrase,
  UserVoiceCorrection,
  // Smart Service Report types (VoiceReportBody is a Zod const — exported above via generated/api)
  VoiceReportResult,
  VoiceReportSections,
  VoiceReportStructured,
} from "./generated/types";

// ─── Object Storage schemas (manually maintained) ────────────────────────────
import { z } from "zod/v4";

export const RequestUploadUrlBody = z.object({
  name: z.string(),
  size: z.number(),
  contentType: z.string(),
});

export const RequestUploadUrlResponse = z.object({
  uploadURL: z.string(),
  objectPath: z.string(),
  metadata: z.object({
    name: z.string(),
    size: z.number(),
    contentType: z.string(),
  }),
});
