/**
 * API Utilities: Retry logic, health checks, and error handling
 */

/**
 * Exponential backoff retry with max attempts
 * @param {Function} fn - Async function to retry
 * @param {Object} options - { maxAttempts, initialDelayMs, maxDelayMs }
 * @returns {Promise}
 */
export async function retryWithBackoff(fn, options = {}) {
  const {
    maxAttempts = 3,
    initialDelayMs = 1000,
    maxDelayMs = 10000,
  } = options;

  let lastError;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      
      // Don't retry on 4xx client errors (except 408, 429)
      if (error.response?.status >= 400 && error.response?.status < 500) {
        const retryableHeaders = [408, 429];
        if (!retryableHeaders.includes(error.response.status)) {
          throw error;
        }
      }

      // Calculate backoff
      if (attempt < maxAttempts) {
        const delayMs = Math.min(
          initialDelayMs * Math.pow(2, attempt - 1),
          maxDelayMs
        );
        await new Promise(resolve => setTimeout(resolve, delayMs));
      }
    }
  }

  throw lastError;
}

/**
 * Get backend health status (with caching)
 * @returns {Promise<boolean>}
 */
let lastHealthCheck = null;
let healthCheckCache = null;

export async function isBackendHealthy() {
  const now = Date.now();
  
  // Use cache for 5 seconds to avoid repeated checks
  if (lastHealthCheck && (now - lastHealthCheck) < 5000) {
    return healthCheckCache;
  }

  try {
    const response = await fetch('/api/health', {
      method: 'GET',
      timeout: 3000,
    });
    
    const isHealthy = response.ok;
    lastHealthCheck = now;
    healthCheckCache = isHealthy;
    return isHealthy;
  } catch (error) {
    lastHealthCheck = now;
    healthCheckCache = false;
    console.debug('[API] Backend health check failed:', error.message);
    return false;
  }
}

/**
 * Make API call with automatic retry and health check
 * @param {Function} apiCall - Function that makes the API call
 * @param {Object} options - { skipHealthCheck, maxRetries }
 * @returns {Promise}
 */
export async function makeApiCall(apiCall, options = {}) {
  const { skipHealthCheck = false, maxRetries = 2 } = options;

  // Skip if backend is down (unless caller explicitly skips this check)
  if (!skipHealthCheck) {
    const healthy = await isBackendHealthy();
    if (!healthy) {
      console.debug('[API] Backend unreachable - skipping API call');
      throw new Error('Backend server is not responding. Please check if it is running.');
    }
  }

  // Make call with retry logic
  return retryWithBackoff(apiCall, {
    maxAttempts: maxRetries + 1,
    initialDelayMs: 500,
    maxDelayMs: 2000,
  });
}

/**
 * Check if error is network/connection related
 * @param {Error} error - The error to check
 * @returns {boolean}
 */
export function isNetworkError(error) {
  if (!error) return false;
  
  // Check for axios response errors
  if (error.response) {
    return (
      error.response.status === 0 ||
      error.code === 'ECONNREFUSED' ||
      error.code === 'ENOTFOUND' ||
      error.code === 'ETIMEDOUT'
    );
  }

  // Check for CORS/network errors
  if (error.code === 'ERR_NETWORK' || error.message.includes('Failed to fetch')) {
    return true;
  }

  // Check for timeout
  if (error.code === 'ECONNABORTED') {
    return true;
  }

  return false;
}

/**
 * Get user-friendly error message
 * @param {Error} error - The error to format
 * @returns {string}
 */
export function getErrorMessage(error) {
  if (!error) return 'Unknown error occurred';

  // Network errors
  if (isNetworkError(error)) {
    return 'Unable to connect to server. Please check your connection or if the backend is running.';
  }

  // API response errors
  if (error.response?.data?.message) {
    return error.response.data.message;
  }

  if (error.response?.statusText) {
    return `Server error: ${error.response.statusText}`;
  }

  if (error.message) {
    return error.message;
  }

  return 'An unexpected error occurred';
}
