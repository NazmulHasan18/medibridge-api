import z from "zod";

export const paymentListQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(10),
  paymentStatus: z.enum(["PENDING", "SUCCESS", "FAILED", "REFUNDED"]).optional(),
  from: z.coerce.date().optional(),
  to: z.coerce.date().optional(),
});
