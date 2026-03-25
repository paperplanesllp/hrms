export const asyncHandler = (fn) => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch((error) => {
    console.error("\n❌ ASYNC HANDLER CAUGHT ERROR:");
    console.error("Error Type:", error.constructor.name);
    console.error("Error Message:", error.message);
    if (error.errors) {
      console.error("Validation Errors:", error.errors);
    }
    if (error.statusCode) {
      console.error("Status Code:", error.statusCode);
    }
    next(error);
  });