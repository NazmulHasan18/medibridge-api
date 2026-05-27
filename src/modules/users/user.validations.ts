import { z } from "zod";

const doctorSchema = z.object({
  specialization: z.string().min(2, "Specialization is required").max(100),

  experience: z
    .number({
      error: "Experience must be number",
    })
    .min(0)
    .optional(),

  consultationFee: z
    .number({
      error: "Consultation fee must be number",
    })
    .min(0)
    .optional(),

  qualification: z.string().max(200).optional(),

  bio: z.string().max(1000).optional(),
});

export const createUserSchema = z
  .object({
    name: z.string().min(2, "Name must be at least 2 characters").max(100),

    email: z.string().email("Invalid email address").max(255),

    password: z.string().min(6, "Password must be at least 6 characters").optional(),
    referredByCode: z.string().optional(),

    address: z.string().min(5, "Address is required").max(300),

    role: z.enum(["PATIENT", "DOCTOR"]).default("PATIENT"),

    regType: z.enum(["EMAIL", "GOOGLE", "FACEBOOK"]).optional().default("EMAIL"),

    status: z.enum(["ACTIVE", "BLOCKED", "PENDING"]).optional().default("ACTIVE"),

    phone: z.string().min(11).max(20).optional(),

    profileImage: z.string().url("Profile image must be valid URL").optional(),

    referralCode: z.string().optional(),

    isVerified: z.boolean().optional(),

    emailVerifiedAt: z.string().datetime().optional(),

    doctor: doctorSchema.optional(),
  })

  .superRefine((data, ctx) => {
    // Doctor validation
    if (data.role === "DOCTOR" && !data.doctor) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["doctor"],
        message: "Doctor information is required",
      });
    }

    // Patient validation
    if (data.role === "PATIENT" && data.doctor) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["doctor"],
        message: "Patient cannot have doctor data",
      });
    }

    // EMAIL registration validation
    if (data.regType === "EMAIL" && !data.password) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["password"],
        message: "Password is required for email registration",
      });
    }
  });

export type CreateUserPayload = z.infer<typeof createUserSchema>;
