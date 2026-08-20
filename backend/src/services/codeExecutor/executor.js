/**
 * Code Executor Service
 * 
 * Orchestrates isolated code execution using Node.js worker_threads.
 * 
 * ARCHITECTURE:
 * 1. Main process receives (hiddenCode, userInput) from the execution service.
 * 2. Validator checks syntax and forbidden tokens (defence-in-depth).
 * 3. A Worker is spawned from worker.js in a separate thread.
 * 4. The worker runs hiddenCode inside a vm.Context sandbox.
 * 5. The worker posts back { success, output, error }.
 * 6. A master timeout kills the worker if it exceeds the limit.
 * 7. hiddenCode is NEVER returned to the caller in the result.
 * SECURITY:
 * - Code runs in worker_thread (separate V8 isolate, separate event loop)
 * - VM sandbox inside the worker restricts globals
 * - eval() and new Function() disabled inside sandbox via codeGeneration flags
 * - Master timeout kills worker if VM timeout fails
 * - Output truncated to prevent memory exhaustion
 */

const path = require('path');
const { Worker } = require('worker_threads');
const logger = require('../../utils/logger');
const { validateSyntax, scanForbiddenTokens, validateUserInput } = require('./validator');
const { EXECUTION_ERROR, createErrorResult, createSuccessResult } = require('./errors');

const WORKER_PATH = path.join(__dirname, 'worker.js');

/**
 * Default execution configuration.
 * These can be overridden by env config.
 */
const DEFAULT_TIMEOUT_MS = 5000;       // 5 seconds
const DEFAULT_MAX_INPUT_LENGTH = 10000; // 10 KB
const DEFAULT_MAX_OUTPUT_LENGTH = 65536; // 64 KB
const WORKER_KILL_GRACE_MS = 1000;     // Extra grace period before force-killing worker

/**
 * Execute hidden JavaScript code with participant input in an isolated sandbox.
 * 
 * @param {string} hiddenCode - The challenge's hidden JavaScript code (from DB, ADMIN-only)
 * @param {string} userInput - The participant's input string
 * @param {object} options - Execution options
 * @param {number} [options.timeoutMs] - Execution timeout in milliseconds
 * @param {number} [options.maxInputLength] - Maximum participant input length
 * @param {number} [options.maxOutputLength] - Maximum output length
 * @returns {Promise<{ success: boolean, output: string|null, error: object|null }>}
 * The returned object NEVER contains hiddenCode.
 */
const execute = async (hiddenCode, userInput, options = {}) => {
  const timeoutMs = options.timeoutMs || DEFAULT_TIMEOUT_MS;
  const maxInputLength = options.maxInputLength || DEFAULT_MAX_INPUT_LENGTH;
  const maxOutputLength = options.maxOutputLength || DEFAULT_MAX_OUTPUT_LENGTH;

  const inputCheck = validateUserInput(userInput, maxInputLength);
  if (!inputCheck.valid) {
    return inputCheck.result;
  }
  const sanitizedInput = inputCheck.sanitized;

  const syntaxCheck = validateSyntax(hiddenCode);
  if (!syntaxCheck.valid) {
    logger.warn('[EXECUTOR] Hidden code syntax validation failed for a challenge.');
    return syntaxCheck.result;
  }

  const tokenCheck = scanForbiddenTokens(hiddenCode);
  if (!tokenCheck.safe) {
    logger.warn('[EXECUTOR] Hidden code contains forbidden tokens.');
    return tokenCheck.result;
  }

  return new Promise((resolve) => {
    let isResolved = false;
    let worker;
    let masterTimeout;

    const cleanup = () => {
      if (masterTimeout) {
        clearTimeout(masterTimeout);
        masterTimeout = null;
      }
    };

    const safeResolve = (result) => {
      if (isResolved) return;
      isResolved = true;
      cleanup();

      // Truncate output if necessary
      if (result.output && result.output.length > maxOutputLength) {
        result.output = result.output.substring(0, maxOutputLength) + '\n[Output truncated]';
      }

      resolve(result);
    };

    try {
      worker = new Worker(WORKER_PATH, {
        // Worker resource limits
        resourceLimits: {
          maxOldGenerationSizeMb: 64,  // 64 MB heap limit
          maxYoungGenerationSizeMb: 16, // 16 MB young gen
          codeRangeSizeMb: 16,          // 16 MB code range
        },
      });
    } catch (err) {
      logger.error('[EXECUTOR] Failed to spawn worker thread:', err.message);
      return resolve(createErrorResult(EXECUTION_ERROR.WORKER_CRASH));
    }

    // Master timeout — kills worker if it exceeds the limit
    // This is a safety net above the VM-level timeout inside the worker
    masterTimeout = setTimeout(() => {
      logger.warn(`[EXECUTOR] Master timeout reached (${timeoutMs + WORKER_KILL_GRACE_MS}ms). Terminating worker.`);
      worker.terminate().catch(() => {});
      safeResolve(createErrorResult(EXECUTION_ERROR.TIMEOUT));
    }, timeoutMs + WORKER_KILL_GRACE_MS);

    // Handle worker response
    worker.on('message', (result) => {
      // Translate worker error codes to our standardized error format
      if (!result.success && result.error) {
        const errorCode = result.error.code;
        const mapped = Object.values(EXECUTION_ERROR).includes(errorCode)
          ? errorCode
          : EXECUTION_ERROR.RUNTIME;

        safeResolve(createErrorResult(mapped, result.error.message));
      } else {
        safeResolve(createSuccessResult(result.output || ''));
      }

      // Terminate worker after receiving result
      worker.terminate().catch(() => {});
    });

    // Handle worker errors (crash, OOM, etc.)
    worker.on('error', (err) => {
      logger.error('[EXECUTOR] Worker error:', err.message);

      if (err.message && err.message.includes('out of memory')) {
        safeResolve(createErrorResult(EXECUTION_ERROR.MEMORY));
      } else {
        safeResolve(createErrorResult(EXECUTION_ERROR.WORKER_CRASH));
      }

      worker.terminate().catch(() => {});
    });

    // Handle unexpected worker exit
    worker.on('exit', (code) => {
      if (code !== 0) {
        logger.warn(`[EXECUTOR] Worker exited with non-zero code: ${code}`);
        safeResolve(createErrorResult(EXECUTION_ERROR.WORKER_CRASH));
      }
    });

    // Send execution payload to worker
    // hiddenCode is sent to worker ONLY, never returned
    worker.postMessage({
      hiddenCode,
      userInput: sanitizedInput,
      timeoutMs,
    });
  });
};

module.exports = {
  execute,
  DEFAULT_TIMEOUT_MS,
  DEFAULT_MAX_INPUT_LENGTH,
  DEFAULT_MAX_OUTPUT_LENGTH,
};
