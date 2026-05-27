import { Request, Response, NextFunction } from "express";
import { ZodSchema } from "zod";

type RequestPart = "body" | "query" | "params";

export const validate =
  (schema: ZodSchema, type: RequestPart = "body") =>
  (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = schema.safeParse(req[type]);

      if (!result.success) {
        return res.status(400).json({
          message: "Validation failed",
          errors: result.error.format(),
        });
      }

      // replace request data with parsed data (important for safety)
      req[type] = result.data;

      next();
    } catch (err) {
      return res.status(500).json({ message: "Internal server error" });
    }
  };
