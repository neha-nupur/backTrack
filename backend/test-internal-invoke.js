const vm = require('vm');

const hiddenCode = `
function isValid(s) {
    const stack = [];
    const pairs = { ')': '(', ']': '[', '}': '{' };
    for (const char of s) {
        if (char === '(' || char === '[' || char === '{') {
            stack.push(char);
        } else {
            if (stack.length === 0 || stack.pop() !== pairs[char]) {
                return false;
            }
        }
    }
    return stack.length === 0;
}
`;

function buildScriptWithAutoInvoke(code) {
  // If user code already has console.log or top-level return, run as is
  if (/\bconsole\.log\b/.test(code)) {
    return code;
  }
  if (/\breturn\b/.test(code) && !/\bfunction\b/.test(code)) {
    return '(() => {\n' + code + '\n})()';
  }

  // If code contains function declaration(s), append internal auto-invocation logic:
  return `
${code}

;(() => {
  const _builtIns = new Set([
    'console', 'Math', 'Date', 'JSON', 'parseInt', 'parseFloat', 'isNaN', 'isFinite',
    'Number', 'String', 'Boolean', 'Array', 'Object', 'Map', 'Set', 'WeakMap', 'WeakSet',
    'Symbol', 'RegExp', 'Error', 'TypeError', 'RangeError', 'SyntaxError', 'ReferenceError',
    'URIError', 'EvalError', 'Promise', 'Proxy', 'Reflect', 'encodeURI', 'encodeURIComponent',
    'decodeURI', 'decodeURIComponent', 'userInput', 'input', 'INPUT', 'USER_INPUT',
    'readLine', 'readline', 'read'
  ]);

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

  const _g = typeof globalThis !== 'undefined' ? globalThis : this;
  const _fns = Object.keys(_g).filter(k => !_builtIns.has(k) && typeof _g[k] === 'function');
  if (_fns.length > 0) {
    const _targetFn = _g[_fns[_fns.length - 1]];
    const _rawIn = typeof userInput !== 'undefined' ? userInput : '';
    const _args = _parseInputToArgs(_rawIn, _targetFn.length || 1);
    let _res;
    try {
      _res = _targetFn(..._args);
    } catch (err1) {
      try {
        _res = _targetFn(..._args.map(a => typeof a === 'number' ? String(a) : a));
      } catch (err2) {
        _res = _targetFn(_rawIn);
      }
    }
    if (_res !== undefined && _res !== null) {
      console.log(typeof _res === 'object' ? JSON.stringify(_res) : String(_res));
    }
  }
})();
`;
}

const outputBuffer = [];
const safeConsole = { log: (...a) => outputBuffer.push(a.join(' ')) };
const sandbox = {
  console: safeConsole,
  Math, Date, JSON, parseInt, parseFloat, isNaN, isFinite,
  Number, String, Boolean, Array, Object, Map, Set,
  userInput: '()[]{}',
  input: '()[]{}',
};

const context = vm.createContext(sandbox, { codeGeneration: { strings: false, wasm: false } });
const finalScriptText = buildScriptWithAutoInvoke(hiddenCode);
console.log('--- GENERATED SCRIPT TEXT ---');
console.log(finalScriptText);

const script = new vm.Script(finalScriptText);
script.runInContext(context);

console.log('--- OUTPUT CAPTURED ---');
console.log('Output:', JSON.stringify(outputBuffer.join('\n')));
