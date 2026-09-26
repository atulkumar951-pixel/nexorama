export class ApiError extends Error {
  public readonly statusCode: number;
  public readonly code: string;
  public readonly details?: unknown;

  constructor(statusCode: number, code: string, message: string, details?: unknown) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
    Error.captureStackTrace(this, this.constructor);
  }
}

export const Errors = {
  badRequest: (message = "Invalid request", details?: unknown) =>
    new ApiError(400, "BAD_REQUEST", message, details),
  unauthorized: (message = "Authentication required") =>
    new ApiError(401, "UNAUTHORIZED", message),
  forbidden: (message = "You do not have permission to perform this action") =>
    new ApiError(403, "FORBIDDEN", message),
  /** Marketplace mode blocks this purchase flow (PRD §77). */
  featureNotAvailable: (message = "This feature is not available right now") =>
    new ApiError(403, "FEATURE_NOT_AVAILABLE", message),
  notFound: (message = "Resource not found") => new ApiError(404, "NOT_FOUND", message),
  conflict: (message = "Resource already exists") => new ApiError(409, "CONFLICT", message),
  gone: (message = "This link has expired") => new ApiError(410, "GONE", message),
  payloadTooLarge: (message = "File is too large") =>
    new ApiError(413, "PAYLOAD_TOO_LARGE", message),
  unsupportedMedia: (message = "File type is not allowed") =>
    new ApiError(415, "UNSUPPORTED_MEDIA_TYPE", message),
  tooManyRequests: (message = "Too many requests. Please slow down.") =>
    new ApiError(429, "TOO_MANY_REQUESTS", message),
  internal: (message = "Something went wrong. Please try again.") =>
    new ApiError(500, "INTERNAL_ERROR", message),
};
