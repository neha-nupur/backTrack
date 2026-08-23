/**
 * Pre-Execution Validator
 * 
 * Validates hidden code syntax and scans for forbidden tokens
 * BEFORE spawning an isolated worker. This is a defence-in-depth
 * measure — the sandbox itself also restricts access, but catching
 * obvious abuse early saves resources.
 */

const { EXECUTION_ERROR, createErrorResult } = require('./errors');

/**
 * Forbidden module/global patterns in hiddenCode.
 * These are checked as a defence-in-depth layer.
 * The sandbox itself also prevents access to these.
 */
const FORBIDDEN_PATTERNS = [
  // Node built-in modules that must not be referenced
  /\brequire\s*\(\s*['"`]child_process['"`]\s*\)/,
  /\brequire\s*\(\s*['"`]fs['"`]\s*\)/,
  /\brequire\s*\(\s*['"`]net['"`]\s*\)/,
  /\brequire\s*\(\s*['"`]http['"`]\s*\)/,
  /\brequire\s*\(\s*['"`]https['"`]\s*\)/,
  /\brequire\s*\(\s*['"`]dgram['"`]\s*\)/,
  /\brequire\s*\(\s*['"`]cluster['"`]\s*\)/,
  /\brequire\s*\(\s*['"`]worker_threads['"`]\s*\)/,
  /\brequire\s*\(\s*['"`]vm['"`]\s*\)/,
  /\brequire\s*\(\s*['"`]os['"`]\s*\)/,
  // Global escape hatches
  /\bprocess\s*\.\s*exit/,
  /\bprocess\s*\.\s*env/,
  /\bprocess\s*\.\s*kill/,
  /\bglobalThis\b/,
];

/**
 * Validate hiddenCode syntax by attempting to parse it.
 * @param {string} code - The hidden JavaScript code to validate
 * @returns {{ valid: boolean, result?: object }} 
 */
const validateSyntax = (code) => {
  try {
    // Use Function constructor to parse without executing
    // This catches syntax errors before worker spawn
    new Function(code);
    return { valid: true };
  } catch (err) {
    if (err instanceof SyntaxError) {
      return {
        valid: false,
        result: createErrorResult(EXECUTION_ERROR.SYNTAX, 'The challenge code contains a syntax error.'),
      };
    }
    return {
      valid: false,
      result: createErrorResult(EXECUTION_ERROR.INTERNAL),
    };
  }
};

/**
 * Scan hiddenCode for forbidden patterns as defence-in-depth.
 * @param {string} code - The hidden JavaScript code to scan
 * @returns {{ safe: boolean, result?: object }}
 */
const scanForbiddenTokens = (code) => {
  for (const pattern of FORBIDDEN_PATTERNS) {
    if (pattern.test(code)) {
      return {
        safe: false,
        result: createErrorResult(
          EXECUTION_ERROR.FORBIDDEN,
          'The challenge code references a forbidden module or operation.'
        ),
      };
    }
  }
  return { safe: true };
};

/**
 * Validate user input before execution.
 * @param {string} userInput - The participant's input string
 * @param {number} maxLength - Maximum allowed input length
 * @returns {{ valid: boolean, result?: object }}
 */
const validateUserInput = (userInput, maxLength) => {
  if (userInput === undefined || userInput === null || typeof userInput !== 'string' || userInput.trim().length === 0) {
    return {
      valid: false,
      result: createErrorResult(EXECUTION_ERROR.INPUT_VALIDATION, 'Please enter a valid input before executing.'),
    };
  }

  if (userInput.length > maxLength) {
    return {
      valid: false,
      result: createErrorResult(
        EXECUTION_ERROR.INPUT_VALIDATION,
        `Input exceeds maximum length of ${maxLength} characters.`
      ),
    };
  }

  return { valid: true, sanitized: userInput };
};

module.exports = {
  validateSyntax,
  scanForbiddenTokens,
  validateUserInput,
  FORBIDDEN_PATTERNS,
};
