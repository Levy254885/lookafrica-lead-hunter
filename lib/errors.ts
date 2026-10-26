/** Error with an HTTP status and a stable machine-readable code, safe to show to the caller. */
export class ApiError extends Error {
  readonly status: number;
  readonly code: string;
  readonly details?: unknown;

  constructor(status: number, code: string, message: string, details?: unknown) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

export const Errors = {
  unauthenticated: () => new ApiError(401, 'unauthenticated', 'Sign in to continue.'),
  forbidden: (message = 'You do not have access to this resource.') =>
    new ApiError(403, 'forbidden', message),
  notFound: (message = 'Not found.') => new ApiError(404, 'not_found', message),
  badRequest: (message: string, details?: unknown) =>
    new ApiError(400, 'invalid_request', message, details),
  conflict: (message: string) => new ApiError(409, 'conflict', message),
  unavailable: (code: string, message: string) => new ApiError(503, code, message),
};
