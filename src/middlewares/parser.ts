import { NextFunction, Request, Response } from "express";

export const parseJsonFields = (fields: string[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    for (const field of fields) {
      if (req.body[field] && typeof req.body[field] === "string") {
        try {
          req.body[field] = JSON.parse(req.body[field]);
        } catch (error) {
          next({ message: `Invalid JSON format for field: ${field}` });
          return;
        }
      }
    }
    next();
  };
};
