/**
 * Middleware to prevent browser caching of API responses.
 * This ensures clients always receive fresh data from the server.
 */
export function noCache(req, res, next) {
  res.set({
    "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0",
    "Pragma": "no-cache",
    "Expires": "0",
    "Surrogate-Control": "no-store"
  });
  next();
}

