/**
 * Standardized Execution Error Categories
 * 
 * These error types represent distinct failure modes during
 * controlled hidden-code execution. They are returned to the
 * participant as safe, non-leaking error descriptions.
 */

/**
 * Execution error codes — used in executor result payloads.
 * CRITICAL: Error messages must NEVER leak hiddenCode content,
 * file paths, environment variables, or internal stack traces.
 */
const EXECUTION_ERROR = Object.freeze({
  TIMEOUT: 'EXECUTION_TIMEOUT',
  RUNTIME: 'RUNTIME_ERROR',
  SYNTAX: 'SYNTAX_ERROR',
  MEMORY: 'MEMORY_LIMIT_EXCEEDED',
  WORKER_CRASH: 'WORKER_CRASH',
  INTERNAL: 'EXECUTION_INTERNAL_ERROR',
  FORBIDDEN: 'FORBIDDEN_OPERATION',
  INPUT_VALIDATION: 'INPUT_VALIDATION_ERROR',
});

/**
 * Safe, participant-facing error messages.
 * These MUST NOT contain any information about the hiddenCode,
 * file system paths, or internal architecture.
 */
const EXECUTION_ERROR_MESSAGES = Object.freeze({
  [EXECUTION_ERROR.TIMEOUT]: 'Execution timed out. Your input may cause the logic to run too long.',
  [EXECUTION_ERROR.RUNTIME]: 'A runtime error occurred during execution.',
  [EXECUTION_ERROR.SYNTAX]: 'A syntax error was detected in the execution logic.',
  [EXECUTION_ERROR.MEMORY]: 'Execution exceeded memory limits.',
  [EXECUTION_ERROR.WORKER_CRASH]: 'The execution environment encountered an unexpected failure.',
  [EXECUTION_ERROR.INTERNAL]: 'An internal execution error occurred. Please try again.',
  [EXECUTION_ERROR.FORBIDDEN]: 'The execution attempted a forbidden operation.',
  [EXECUTION_ERROR.INPUT_VALIDATION]: 'Invalid input provided for execution.',
});

/**
 * Create a safe execution result object for error cases.
 * CRITICAL: Never include raw error.stack or hiddenCode in the output.
 */
const createErrorResult = (errorCode, details = null) => ({
  success: false,
  output: null,
  error: {
    code: errorCode,
    message: EXECUTION_ERROR_MESSAGES[errorCode] || EXECUTION_ERROR_MESSAGES[EXECUTION_ERROR.INTERNAL],
    ...(details ? { details: String(details).substring(0, 500) } : {}),
  },
});

/**
 * Create a successful execution result object.
 */
const createSuccessResult = (output) => ({
  success: true,
  output: output,
  error: null,
});

module.exports = {
  EXECUTION_ERROR,
  EXECUTION_ERROR_MESSAGES,
  createErrorResult,
  createSuccessResult,
};
