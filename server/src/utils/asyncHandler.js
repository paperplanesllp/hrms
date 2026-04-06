export const asyncHandler = (fn) => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch((error) => {
    const statusCode = error?.statusCode;
    const isClientError = statusCode >= 400 && statusCode < 500;

    if (isClientError) {
      console.warn("\n⚠️ ASYNC HANDLER CLIENT ERROR:");
      console.warn("Error Type:", error.constructor.name);
      console.warn("Error Message:", error.message);
      console.warn("Status Code:", statusCode);
      if (error.errors) {
        console.warn("Validation Errors:", error.errors);
      }
    } else {
      console.error("\n❌ ASYNC HANDLER CAUGHT ERROR:");
      console.error("Error Type:", error.constructor.name);
      console.error("Error Message:", error.message);
      if (error.errors) {
        console.error("Validation Errors:", error.errors);
      }
      if (statusCode) {
        console.error("Status Code:", statusCode);
      }
    }

    next(error);
  });