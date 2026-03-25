/**
 * Response Helper Functions
 * Standardized response formats for API endpoints
 */

export const sendSuccess = (res, data, message = 'Success', statusCode = 200) => {
  return res.status(statusCode).json({
    success: true,
    message,
    data
  });
};

export const sendError = (res, message = 'Error', statusCode = 400, errors = null) => {
  const response = {
    success: false,
    message
  };

  if (errors) {
    response.errors = errors;
  }

  return res.status(statusCode).json(response);
};

export const sendPaginatedSuccess = (res, data, pagination, message = 'Success', statusCode = 200) => {
  return res.status(statusCode).json({
    success: true,
    message,
    data,
    pagination
  });
};

export const sendValidationError = (res, errors) => {
  return res.status(422).json({
    success: false,
    message: 'Validation failed',
    errors
  });
};
