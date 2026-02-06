import type { Response } from "express";
import type { ZodError } from "zod";

type ErrorDetails = Array<{
  path: string;
  message: string;
  code?: string;
}>;

const getRequestId = (res: Response) =>
  typeof res.locals.requestId === "string" ? res.locals.requestId : undefined;

export const formatZodError = (error: ZodError): ErrorDetails =>
  error.issues.map((issue) => ({
    path: issue.path.join("."),
    message: issue.message,
    code: issue.code,
  }));

export const sendError = (
  res: Response,
  status: number,
  code: string,
  message: string,
  details?: ErrorDetails,
) => {
  res.status(status).json({
    error: message,
    code,
    details,
    requestId: getRequestId(res),
  });
};
