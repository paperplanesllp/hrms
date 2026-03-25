/**
 * Convert validation errors to user-friendly messages
 * Handles Zod validation errors, arrays, and strings
 */
export const formatErrorMessage = (error) => {
  // If it's already a nice string message, return it
  if (typeof error === 'string') {
    return error;
  }

  // Handle array of validation errors (Zod format)
  if (Array.isArray(error)) {
    return formatValidationErrors(error);
  }

  // If it's a Zod error object
  if (error && typeof error === 'object') {
    // Check if it has error array
    if (Array.isArray(error.errors)) {
      return formatValidationErrors(error.errors);
    }
    // If it's a single error object
    if (error.message) {
      return error.message;
    }
  }

  return 'An error occurred. Please check your information.';
};

/**
 * Convert Zod validation errors to friendly messages
 */
const formatValidationErrors = (errors) => {
  if (!Array.isArray(errors) || errors.length === 0) {
    return 'Validation failed. Please check your information.';
  }

  // Get the first error for display
  const firstError = errors[0];
  const fieldName = getFieldName(firstError.path);
  const message = getErrorMessage(firstError.code, fieldName, firstError);

  return message;
};

/**
 * Get human-readable field name from path array
 */
const getFieldName = (path) => {
  if (!Array.isArray(path) || path.length === 0) return 'Field';
  
  const field = path[0];
  const fieldNames = {
    body: 'Message',
    title: 'Title',
    subject: 'Subject',
    email: 'Email',
    password: 'Password',
    name: 'Name',
    description: 'Description',
    content: 'Content',
    message: 'Message',
    phone: 'Phone number',
    imageUrl: 'Image',
  };
  
  return fieldNames[field] || capitalizeFirstLetter(String(field));
};

/**
 * Get user-friendly error message based on validation code
 */
const getErrorMessage = (code, fieldName, errorObj = {}) => {
  const messages = {
    too_small: () => {
      const min = errorObj.minimum;
      return `It needs to be at least ${min} character${min > 1 ? 's' : ''} long.`;
    },
    too_big: () => {
      const max = errorObj.maximum;
      return `It should not exceed ${max} character${max > 1 ? 's' : ''}.`;
    },
    invalid_type: () => {
      return `${fieldName} must be a valid ${errorObj.expected}`;
    },
    invalid_string: () => {
      if (errorObj.validation === 'email') {
        return 'Please provide a valid email address.';
      }
      return `${fieldName} is not in the correct format.`;
    },
    invalid_enum_value: () => {
      return `${fieldName} must be one of: ${errorObj.options?.join(', ')}`;
    },
    not_a_number: () => {
      return `${fieldName} must be a number.`;
    },
    unrecognized_keys: () => {
      return `Unknown field: ${errorObj.keys?.join(', ')}`;
    },
    invalid_literal: () => {
      return `${fieldName} must equal ${errorObj.expected}`;
    },
  };

  const messageFn = messages[code];
  if (messageFn) {
    return messageFn();
  }

  // Fallback message
  return `${fieldName} is invalid. Please check and try again.`;
};

/**
 * Capitalize first letter of a string
 */
const capitalizeFirstLetter = (str) => {
  return str.charAt(0).toUpperCase() + str.slice(1);
};
