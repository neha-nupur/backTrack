/**
 * Isolated VM Worker — Runs inside a Node.js worker_thread
 * 
 * SECURITY BOUNDARY:
 * This file executes inside a worker_thread. It receives a message
 * containing { hiddenCode, userInput }, runs the code in an isolated
 * vm.Context with a strictly limited global scope, and posts back
 * the captured output.
 * 
 * CRITICAL INVARIANTS:
 * 1. NO require/import of fs, net, http, child_process, os, etc.
 * 2. NO access to process.env, process.exit, or globalThis from inside the VM
 * 3. Strict timeout enforcement via vm.runInContext options
 * 4. Output capture via a controlled console.log replacement
 * 5. The worker NEVER sends hiddenCode back to the parent
 */

'use strict';

const { parentPort } = require('worker_threads');
const vm = require('vm');

/**
 * Maximum output buffer size (characters).
 * Prevents memory exhaustion from infinite console.log loops.
 */
const MAX_OUTPUT_SIZE = 65536; // 64 KB

/**
 * Build a strictly sandboxed VM context.
 * Only safe, pure-computation globals are exposed.
 * 
 * @param {string[]} outputBuffer - Array to capture console output lines
 * @returns {vm.Context}
 */
const buildSandboxContext = (outputBuffer) => {
  let outputSize = 0;

  const safeConsole = {
    log: (...args) => {
      const line = args.map(a => {
        if (a === undefined) return 'undefined';
        if (a === null) return 'null';
        if (typeof a === 'object') {
          try { return JSON.stringify(a); } catch { return String(a); }
        }
        return String(a);
      }).join(' ');

      outputSize += line.length;
      if (outputSize <= MAX_OUTPUT_SIZE) {
        outputBuffer.push(line);
      }
    },
    error: (...args) => {
      // Redirect to log for output capture
      safeConsole.log(...args);
    },
    warn: (...args) => {
      safeConsole.log(...args);
    },
    info: (...args) => {
      safeConsole.log(...args);
    },
  };

  // Build the sandbox with ONLY safe globals
  const sandbox = {
    console: safeConsole,
    // Safe built-in constructors and utilities
    Math,
    Date,
    JSON,
    parseInt,
    parseFloat,
    isNaN,
    isFinite,
    Number,
    String,
    Boolean,
    Array,
    Object,
    Map,
    Set,
    WeakMap,
    WeakSet,
    Symbol,
    RegExp,
    Error,
    TypeError,
    RangeError,
    SyntaxError,
    ReferenceError,
    URIError,
    EvalError,
    Promise,
    Proxy,
    Reflect,
    // Encoding utilities
    encodeURI,
    encodeURIComponent,
    decodeURI,
    decodeURIComponent,
    // Timeout/Interval are NOT included (no async escape)
    // require is NOT included
    // process is NOT included
    // globalThis is NOT included
    // eval is NOT included
    // Function constructor is NOT included
  };

  return vm.createContext(sandbox, {
    name: 'BlackBox Execution Sandbox',
    // Prevent code from breaking out via __proto__ or constructor chains
    codeGeneration: {
      strings: false,  // Disables eval() and new Function() inside the VM
      wasm: false,     // Disables WebAssembly compilation
    },
  });
};

/**
 * Execute hiddenCode with userInput in the isolated VM context.
 */
const executeInSandbox = (hiddenCode, userInput, timeoutMs) => {
  const outputBuffer = [];
  const context = buildSandboxContext(outputBuffer);

  // Inject userInput as a read-only frozen string in the sandbox
  context.userInput = Object.freeze(userInput);

  try {
    const script = new vm.Script(hiddenCode, {
      filename: 'challenge.vm.js', // Safe pseudo-filename (no real path)
      timeout: timeoutMs,
    });

    script.runInContext(context, {
      timeout: timeoutMs,
      breakOnSigint: true,
    });

    return {
      success: true,
      output: outputBuffer.join('\n'),
      error: null,
    };
  } catch (err) {
    // Classify the error WITHOUT leaking hiddenCode content
    if (err.code === 'ERR_SCRIPT_EXECUTION_TIMEOUT' || 
        (err.message && err.message.includes('Script execution timed out'))) {
      return {
        success: false,
        output: outputBuffer.join('\n'),
        error: {
          code: 'EXECUTION_TIMEOUT',
          message: 'Execution timed out.',
        },
      };
    }

    if (err instanceof SyntaxError) {
      return {
        success: false,
        output: outputBuffer.join('\n'),
        error: {
          code: 'SYNTAX_ERROR',
          // Only report error type, NOT the line content (which could leak hiddenCode)
          message: 'A syntax error occurred during execution.',
        },
      };
    }

    // Runtime errors (ReferenceError, TypeError, RangeError, etc.)
    // Sanitize: only send error type and a truncated safe message
    const safeMessage = err.message ? String(err.message).substring(0, 200) : 'Unknown runtime error';
    
    return {
      success: false,
      output: outputBuffer.join('\n'),
      error: {
        code: 'RUNTIME_ERROR',
        message: safeMessage,
      },
    };
  }
};

// ─── Worker Message Handler ─────────────────────────────────────────────────
parentPort.on('message', (msg) => {
  const { hiddenCode, userInput, timeoutMs } = msg;

  if (!hiddenCode || typeof hiddenCode !== 'string') {
    parentPort.postMessage({
      success: false,
      output: null,
      error: {
        code: 'EXECUTION_INTERNAL_ERROR',
        message: 'No executable code provided to worker.',
      },
    });
    return;
  }

  const result = executeInSandbox(
    hiddenCode,
    typeof userInput === 'string' ? userInput : '',
    typeof timeoutMs === 'number' && timeoutMs > 0 ? timeoutMs : 5000
  );

  // Never send hiddenCode back to parent
  parentPort.postMessage({
    success: result.success,
    output: result.output,
    error: result.error,
  });
});
