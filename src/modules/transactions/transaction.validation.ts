import z from "zod";

export const transactionListQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(10),
  type: z
    .enum([
      "APPOINTMENT_PAYMENT",
      "REFERRAL_BONUS",
      "REFUND",
      "ADMIN_ADJUSTMENT",
      "WALLET_TOPUP",
      "COIN_USAGE",
    ])
    .optional(),
  status: z.enum(["PENDING", "SUCCESS", "FAILED", "CANCELLED"]).optional(),
  from: z.coerce.date().optional(),
  to: z.coerce.date().optional(),
});

export type TransactionQuery = z.infer<typeof transactionListQuerySchema>;
