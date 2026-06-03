import { z } from "zod";

export const updateDoctorSchema = z.object({
  specialization: z.string().min(2, "Specialization is required").optional(),

  experience: z
    .number()
    .int("Experience must be an integer")
    .min(0, "Experience cannot be negative")
    .optional(),

  consultationFee: z.number().min(0, "Fee cannot be negative").optional(),

  qualification: z.string().min(2).optional(),

  bio: z.string().max(1000).optional(),
});
