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
const buildSandboxContext = (outputBuffer, cleanInput = '') => {
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

  // Build the sandbox with ONLY safe globals and participant input
  const sandbox = {
    console: safeConsole,
    userInput: Object.freeze(cleanInput),
    input: Object.freeze(cleanInput),
    INPUT: Object.freeze(cleanInput),
    USER_INPUT: Object.freeze(cleanInput),
    readLine: () => cleanInput,
    readline: () => cleanInput,
    read: () => cleanInput,
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

const BUILT_IN_GLOBALS = new Set([
  'console', 'Math', 'Date', 'JSON', 'parseInt', 'parseFloat', 'isNaN', 'isFinite',
  'Number', 'String', 'Boolean', 'Array', 'Object', 'Map', 'Set', 'WeakMap', 'WeakSet',
  'Symbol', 'RegExp', 'Error', 'TypeError', 'RangeError', 'SyntaxError', 'ReferenceError',
  'URIError', 'EvalError', 'Promise', 'Proxy', 'Reflect', 'encodeURI', 'encodeURIComponent',
  'decodeURI', 'decodeURIComponent', 'userInput', 'input', 'INPUT', 'USER_INPUT',
  'readLine', 'readline', 'read'
]);

/**
 * Parses raw input string into function arguments matching common formats:
 * - JSON arrays/objects: e.g. [2, 7, 11, 15]
 * - Comma-separated arguments: e.g. [2, 7, 11, 15], 9
 * - Multi-line inputs: e.g. 2 3 4 5 \n 7
 * - Strings, Numbers, Booleans
 */
const parseInputToArgs = (rawInput, expectedArgCount = 1) => {
  const trimmed = String(rawInput || '').trim();
  if (!trimmed) return [''];

  const parseToken = (str) => {
    const s = String(str || '').trim();
    if (!s) return s;
    try { return JSON.parse(s); } catch (e) {}
    if (s.includes(' ') || s.includes(',')) {
      const parts = s.split(/[,\\s]+/).map(p => p.trim()).filter(Boolean);
      if (parts.length > 1 && parts.every(p => !isNaN(p))) {
        return parts.map(Number);
      }
    }
    if (!isNaN(s)) return Number(s);
    if ((s.startsWith('"') && s.endsWith('"')) || (s.startsWith("'") && s.endsWith("'"))) {
      return s.slice(1, -1);
    }
    return s;
  };

  try {
    const parsed = JSON.parse(trimmed);
    if (Array.isArray(parsed) && expectedArgCount > 1 && parsed.length === expectedArgCount && (Array.isArray(parsed[0]) || typeof parsed[0] === 'object')) {
      return parsed;
    }
    if (expectedArgCount === 1) {
      return [parsed];
    }
  } catch (e) {}

  try {
    const wrapped = JSON.parse('[' + trimmed + ']');
    if (Array.isArray(wrapped) && wrapped.length > 1) {
      return wrapped;
    }
  } catch (e) {}

  const lines = trimmed.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
  if (lines.length > 1) {
    const parsedLines = lines.map(parseToken);
    // CP format: line 1 = N (size), line 2 = array, line 3 = target
    if (parsedLines.length === 3 && expectedArgCount === 2) {
      if (typeof parsedLines[0] === 'number' && Array.isArray(parsedLines[1])) {
        return [parsedLines[1], parsedLines[2]];
      }
    }
    return parsedLines;
  }

  const parsedSingle = parseToken(trimmed);
  return [parsedSingle];
};

/**
 * Build executable script payload.
 * If hiddenCode defines pure function(s) without calling console.log or top-level return,
 * appends an internal auto-invocation wrapper inside the VM script itself.
 */
const buildExecutableScript = (code) => {
  // If code explicitly uses console.log, run directly
  if (/\bconsole\.log\b/.test(code)) {
    return code;
  }

  // If top-level return is detected without function declaration, wrap in IIFE
  if (/\breturn\b/.test(code) && !/\bfunction\b/.test(code)) {
    return '(() => {\n' + code + '\n})()';
  }

  // Extract function names declared in the hiddenCode
  const fnRegex = /(?:function\s+([a-zA-Z0-9_$]+)|(?:const|let|var)\s+([a-zA-Z0-9_$]+)\s*=\s*(?:function|\([^)]*\)\s*=>))/g;
  let match;
  let targetFnName = null;
  while ((match = fnRegex.exec(code)) !== null) {
    targetFnName = match[1] || match[2];
  }

  if (targetFnName) {
    return `
${code}

;(() => {
  const _parseToken = (str) => {
    const s = String(str || '').trim();
    if (!s) return s;
    try { return JSON.parse(s); } catch (e) {}
    if (s.includes(' ') || s.includes(',')) {
      const parts = s.split(/[,\\s]+/).map(p => p.trim()).filter(Boolean);
      if (parts.length > 1 && parts.every(p => !isNaN(p))) {
        return parts.map(Number);
      }
    }
    if (!isNaN(s)) return Number(s);
    if ((s.startsWith('"') && s.endsWith('"')) || (s.startsWith("'") && s.endsWith("'"))) {
      return s.slice(1, -1);
    }
    return s;
  };

  const _parseInputToArgs = (rawInput, expectedArgCount = 1) => {
    const trimmed = String(rawInput || '').trim();
    if (!trimmed) return [''];
    try {
      const parsed = JSON.parse(trimmed);
      if (Array.isArray(parsed) && expectedArgCount > 1 && parsed.length === expectedArgCount && (Array.isArray(parsed[0]) || typeof parsed[0] === 'object')) {
        return parsed;
      }
      if (expectedArgCount === 1) return [parsed];
    } catch (e) {}
    try {
      const wrapped = JSON.parse('[' + trimmed + ']');
      if (Array.isArray(wrapped) && wrapped.length > 1) return wrapped;
    } catch (e) {}
    const lines = trimmed.split(/\\r?\\n/).map(l => l.trim()).filter(Boolean);
    if (lines.length > 1) {
      const parsedLines = lines.map(_parseToken);
      if (parsedLines.length === 3 && expectedArgCount === 2) {
        if (typeof parsedLines[0] === 'number' && Array.isArray(parsedLines[1])) {
          return [parsedLines[1], parsedLines[2]];
        }
      }
      return parsedLines;
    }
    return [_parseToken(trimmed)];
  };

  try {
    const _targetFn = ${targetFnName};
    if (typeof _targetFn === 'function') {
      const _rawIn = typeof userInput !== 'undefined' ? userInput : (typeof input !== 'undefined' ? input : '');
      const _trimmed = String(_rawIn || '').trim();

      // Input Format Validation for Array/Numeric functions vs Parentheses functions
      const _fnName = "${targetFnName}";
      if (_fnName === 'twoSum' || _fnName === 'singleNumber') {
        if (/[a-zA-Z]/.test(_trimmed) && !/^\s*\[.*\]\s*$/.test(_trimmed)) {
          console.log("__INVALID_INPUT_FORMAT: Invalid Input Format: This challenge expects an array of numbers (e.g., [2, 7, 11, 15] or 4 1 2 1 2).");
          return;
        }
      }

      if (_fnName === 'isValid') {
        if (/[^\(\)\[\]\{\}\s'"]/g.test(_trimmed)) {
          console.log("__INVALID_INPUT_FORMAT: Invalid Input Format: Input must consist only of bracket characters ()[]{}.");
          return;
        }
      }

      const _args = _parseInputToArgs(_rawIn, _targetFn.length || 1);
      let _res;
      try {
        _res = _targetFn(..._args);
      } catch (err1) {
        try {
          _res = _targetFn(..._args.map(a => typeof a === 'number' ? String(a) : a));
        } catch (err2) {
          try {
            _res = _targetFn(_rawIn);
          } catch (err3) {}
        }
      }
      if (_res !== undefined && _res !== null) {
        console.log(typeof _res === 'object' ? JSON.stringify(_res) : String(_res));
      }
    }
  } catch (err) {}
})();
`;
  }

  return code;
};

/**
 * Execute hiddenCode with userInput in the isolated VM context.
 */
const executeInSandbox = (hiddenCode, userInput, timeoutMs) => {
  const outputBuffer = [];
  const cleanInput = typeof userInput === 'string' ? userInput : String(userInput || '');
  const context = buildSandboxContext(outputBuffer, cleanInput);

  const executableCode = buildExecutableScript(hiddenCode);

  try {
    const script = new vm.Script(executableCode, {
      filename: 'challenge.vm.js', // Safe pseudo-filename (no real path)
      timeout: timeoutMs,
    });

    const evaluatedResult = script.runInContext(context, {
      timeout: timeoutMs,
      breakOnSigint: true,
    });

    // If console.log was not invoked, check evaluatedResult
    if (outputBuffer.length === 0 && evaluatedResult !== undefined && evaluatedResult !== null) {
      if (typeof evaluatedResult === 'object') {
        try {
          outputBuffer.push(JSON.stringify(evaluatedResult));
        } catch {
          outputBuffer.push(String(evaluatedResult));
        }
      } else {
        outputBuffer.push(String(evaluatedResult));
      }
    }

    const outputText = outputBuffer.join('\n');

    if (outputText.startsWith('__INVALID_INPUT_FORMAT:')) {
      return {
        success: false,
        output: '',
        error: {
          code: 'INVALID_INPUT_FORMAT',
          message: outputText.replace('__INVALID_INPUT_FORMAT:', '').trim(),
        },
      };
    }

    if (outputText.length === 0) {
      return {
        success: false,
        output: '',
        error: {
          code: 'NO_OUTPUT',
          message: 'The function executed but returned no output. Please verify your input format.',
        },
      };
    }

    return {
      success: true,
      output: outputText,
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
          message: 'Execution timed out (infinite loop or computational limit exceeded).',
        },
      };
    }

    if (err instanceof SyntaxError) {
      return {
        success: false,
        output: outputBuffer.join('\n'),
        error: {
          code: 'SYNTAX_ERROR',
          message: 'A syntax error occurred during execution: ' + (err.message || ''),
        },
      };
    }

    // Runtime errors (ReferenceError, TypeError, RangeError, etc.)
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
  // Ignore internal Node.js dev/watch messages (e.g. { 'watch:require': [...] })
  if (!msg || typeof msg !== 'object' || msg['watch:require']) {
    return;
  }

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
