import { z } from "zod";
import { OUTCOMES } from "./defaults";

export const outcomeSchema = z.enum(OUTCOMES);

export const createBatchSchema = z.object({
  species: z.string().min(1, "Species is required"),
  zone: z.string().min(1, "Zone is required"),
  sterilizationMethod: z.string().min(1, "Sterilization method is required"),
  inoculationDate: z.string().min(1), // ISO date string (yyyy-mm-dd)
  quantity: z.coerce.number().int().min(1).max(100000),
  pdaBatchRef: z.string().trim().max(120).optional().or(z.literal("")),
  notes: z.string().trim().max(2000).optional().or(z.literal("")),
});

export const updateOutcomeSchema = z.object({
  id: z.string().min(1),
  outcome: outcomeSchema,
});

export const updateBatchSchema = z.object({
  id: z.string().min(1),
  outcome: outcomeSchema,
  notes: z.string().trim().max(2000).optional().or(z.literal("")),
});

export const logMediaPrepSchema = z.object({
  volumeMl: z.coerce.number().positive().max(1000000),
});

export const consumableStepSchema = z.object({
  id: z.string().min(1),
  delta: z.coerce.number(),
});

export const consumableThresholdSchema = z.object({
  id: z.string().min(1),
  threshold: z.coerce.number().min(0),
});

export const ratiosSchema = z.object({
  pdaGramsPerLiter: z.coerce.number().positive().max(100000),
  antibioticMgPerLiter: z.coerce.number().min(0).max(100000),
});

export const optionListSchema = z.object({
  // key identifies which editable list this is
  key: z.enum(["sterilizationMethods", "zones"]),
  values: z.array(z.string().trim().min(1)).max(50),
});

export const speciesListSchema = z.object({
  values: z
    .array(
      z.object({
        name: z.string().trim().min(1),
        code: z
          .string()
          .trim()
          .min(2)
          .max(4)
          .transform((s) => s.toUpperCase()),
      }),
    )
    .max(50),
});
