import { Response } from "express";

interface IResponse<T> {
  statusCode?: number;
  success?: boolean;
  message?: string;
  data?: T | null;
  meta?: {
    page?: number;
    limit?: number;
    total?: number;
    [key: string]: unknown;
  } | null;
}

const sendResponse = <T>(res: Response, options: IResponse<T>): Response => {
  const { statusCode = 200, success = true, message = "Success", data = null, meta = null } = options;

  const payload: Record<string, unknown> = { success, message };
  if (data !== null) payload.data = data;
  if (meta !== null) payload.meta = meta;

  return res.status(statusCode).json(payload);
};

export default sendResponse;
