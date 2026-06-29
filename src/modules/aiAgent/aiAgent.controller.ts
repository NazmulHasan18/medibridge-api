import { Request, Response } from "express";
import catchAsync from "../../utils/catchAsync.js";
import { runAgentTurn } from "./aiAgent.service.js";
import sendResponse from "../../utils/sendResponse.js";

export const chat = catchAsync(async (req: Request, res: Response) => {
  const { messages } = req.body; // Full conversation history from client
  const patientId = req.user!.id; // From your auth middleware

  const result = await runAgentTurn(messages, patientId);

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Agent response",
    data: result,
  });
});
