import { StatusCodes } from "http-status-codes";
import { ZodError } from "zod";

/* -----------------------------
   404 NOT FOUND HANDLER
------------------------------*/
export function notFound(req, res) {

  res.status(StatusCodes.NOT_FOUND).json({
    success: false,
    message: "The requested route could not be found.",
    path: req.originalUrl,
  });

}

/* -----------------------------
   GLOBAL ERROR HANDLER
------------------------------*/
export function errorHandler(err, req, res, next) {

  let statusCode = err.statusCode || StatusCodes.INTERNAL_SERVER_ERROR;
  let message = err.message || "Something went wrong on the server.";

  /* -----------------------------
     ZOD VALIDATION ERROR
  ------------------------------*/
  if (err instanceof ZodError) {

    return res.status(StatusCodes.BAD_REQUEST).json({
      success: false,
      message: "Validation failed. Please check the submitted data.",
      errors: err.errors && Array.isArray(err.errors) ? err.errors.map((error) => ({
        field: error.path.join("."),
        message: error.message,
      })) : err.errors || []
    });

  }

  /* -----------------------------
     MONGODB DUPLICATE ERROR
  ------------------------------*/
  if (err.code === 11000) {

    const field = Object.keys(err.keyValue)[0];

    return res.status(StatusCodes.CONFLICT).json({
      success: false,
      message: `${field} already exists. Please use a different value.`,
    });

  }

  /* -----------------------------
     JWT TOKEN ERROR
  ------------------------------*/
  if (err.name === "JsonWebTokenError") {

    return res.status(StatusCodes.UNAUTHORIZED).json({
      success: false,
      message: "Invalid authentication token. Please log in again.",
    });

  }

  if (err.name === "TokenExpiredError") {

    return res.status(StatusCodes.UNAUTHORIZED).json({
      success: false,
      message: "Your session has expired. Please log in again.",
    });

  }

  /* -----------------------------
     SERVER LOGGING (FOR DEVELOPERS)
  ------------------------------*/
  const isClientError = statusCode >= 400 && statusCode < 500;

  if (isClientError) {
    console.warn("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.warn("⚠️ CLIENT/AUTH ERROR");
    console.warn("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.warn("Status Code:", statusCode);
    console.warn("Message:", err.message);
    console.warn("Route:", req.method, req.originalUrl);
    console.warn("IP:", req.ip);
    console.warn("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");
  } else {
    console.error("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.error("🚨 SERVER ERROR");
    console.error("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.error("Status Code:", statusCode);
    console.error("Message:", err.message);
    console.error("Route:", req.method, req.originalUrl);
    console.error("IP:", req.ip);
    console.error("Stack Trace:\n", err.stack);
    console.error("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");
  }

  /* -----------------------------
     USER FRIENDLY RESPONSE
  ------------------------------*/
  res.status(statusCode).json({
    success: false,
    message:
      statusCode === 500
        ? "An unexpected server error occurred. Please try again later."
        : message,
  });

}