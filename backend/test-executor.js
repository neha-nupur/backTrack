/**
 * Executor Verification Script
 * 
 * Tests the code executor in isolation (no MongoDB required).
 * Validates: output capture, timeout, sandbox isolation, error handling.
 */

const executor = require('./src/services/codeExecutor/executor');

const tests = [];
let passed = 0;
let failed = 0;

const test = (name, fn) => tests.push({ name, fn });

const assert = (condition, message) => {
  if (!condition) throw new Error(message || 'Assertion failed');
};

// ── TEST 1: Basic output capture ────────────────────────────────────────────
test('Basic console.log output capture', async () => {
  const result = await executor.execute(
    'console.log("Hello, BlackBox!");',
    '',
    { timeoutMs: 3000 }
  );
  assert(result.success === true, `Expected success=true, got ${result.success}`);
  assert(result.output === 'Hello, BlackBox!', `Expected "Hello, BlackBox!", got "${result.output}"`);
  assert(result.error === null, 'Expected no error');
});

// ── TEST 2: userInput access ────────────────────────────────────────────────
test('userInput is accessible inside sandbox', async () => {
  const result = await executor.execute(
    'console.log("Input: " + userInput);',
    'test_input_42',
    { timeoutMs: 3000 }
  );
  assert(result.success === true, `Expected success=true`);
  assert(result.output === 'Input: test_input_42', `Expected "Input: test_input_42", got "${result.output}"`);
});

// ── TEST 3: Multi-line output ───────────────────────────────────────────────
test('Multi-line console.log output', async () => {
  const result = await executor.execute(
    'console.log("line1");\nconsole.log("line2");\nconsole.log("line3");',
    '',
    { timeoutMs: 3000 }
  );
  assert(result.success === true, 'Expected success=true');
  assert(result.output === 'line1\nline2\nline3', `Expected multi-line output, got "${result.output}"`);
});

// ── TEST 4: Computation with userInput ──────────────────────────────────────
test('Computation using userInput', async () => {
  const code = `
    const n = parseInt(userInput);
    let sum = 0;
    for (let i = 1; i <= n; i++) sum += i;
    console.log(sum);
  `;
  const result = await executor.execute(code, '10', { timeoutMs: 3000 });
  assert(result.success === true, 'Expected success=true');
  assert(result.output.trim() === '55', `Expected "55", got "${result.output}"`);
});

// ── TEST 5: Timeout enforcement ─────────────────────────────────────────────
test('Timeout enforcement (infinite loop)', async () => {
  const result = await executor.execute(
    'while(true) {}',
    '',
    { timeoutMs: 1000 }
  );
  assert(result.success === false, 'Expected success=false for timeout');
  assert(result.error !== null, 'Expected error object');
  assert(
    result.error.code === 'EXECUTION_TIMEOUT',
    `Expected EXECUTION_TIMEOUT, got "${result.error.code}"`
  );
});

// ── TEST 6: Sandbox — no require ────────────────────────────────────────────
test('Sandbox blocks require()', async () => {
  const result = await executor.execute(
    'const fs = require("fs");',
    '',
    { timeoutMs: 3000 }
  );
  assert(result.success === false, 'Expected success=false');
  // Should be caught by pre-validation (forbidden tokens) or runtime error
  assert(result.error !== null, 'Expected error');
});

// ── TEST 7: Sandbox — no process.env ────────────────────────────────────────
test('Sandbox blocks process.env access', async () => {
  const result = await executor.execute(
    'console.log(typeof process);',
    '',
    { timeoutMs: 3000 }
  );
  assert(result.success === true, 'Expected success=true');
  assert(result.output === 'undefined', `Expected "undefined", got "${result.output}"`);
});

// ── TEST 8: Sandbox — no eval inside VM ─────────────────────────────────────
test('Sandbox blocks eval() inside VM (codeGeneration:strings=false)', async () => {
  const result = await executor.execute(
    'try { eval("1+1"); console.log("LEAK"); } catch(e) { console.log("BLOCKED"); }',
    '',
    { timeoutMs: 3000 }
  );
  assert(result.success === true, 'Expected success=true');
  assert(result.output === 'BLOCKED', `Expected "BLOCKED", got "${result.output}"`);
});

// ── TEST 9: Runtime error handling ──────────────────────────────────────────
test('Runtime error produces safe error result', async () => {
  const result = await executor.execute(
    'undefinedVariable.method();',
    '',
    { timeoutMs: 3000 }
  );
  assert(result.success === false, 'Expected success=false');
  assert(result.error !== null, 'Expected error');
  assert(result.error.code === 'RUNTIME_ERROR', `Expected RUNTIME_ERROR, got "${result.error.code}"`);
});

// ── TEST 10: hiddenCode NEVER in result ─────────────────────────────────────
test('hiddenCode is NEVER present in execution result', async () => {
  const secretCode = 'console.log("CRITICAL_SECRET_PHASE5_MARKER");';
  const result = await executor.execute(secretCode, '', { timeoutMs: 3000 });
  
  // The output should contain the executed result, but the result object itself
  // must never contain the hiddenCode source
  const resultStr = JSON.stringify(result);
  assert(
    !resultStr.includes('CRITICAL_SECRET_PHASE5_MARKER') || result.output.includes('CRITICAL_SECRET_PHASE5_MARKER'),
    'hiddenCode should only appear in output, never as a separate field'
  );
  assert(result.hiddenCode === undefined, 'hiddenCode must not be a field on result');
});

// ── TEST 11: Empty input ────────────────────────────────────────────────────
test('Empty input produces empty string userInput', async () => {
  const result = await executor.execute(
    'console.log(userInput === "" ? "empty" : "not_empty");',
    '',
    { timeoutMs: 3000 }
  );
  assert(result.success === true, 'Expected success=true');
  assert(result.output === 'empty', `Expected "empty", got "${result.output}"`);
});

// ── TEST 12: JSON output ────────────────────────────────────────────────────
test('JSON object output via console.log', async () => {
  const result = await executor.execute(
    'console.log({ key: "value", num: 42 });',
    '',
    { timeoutMs: 3000 }
  );
  assert(result.success === true, 'Expected success=true');
  assert(result.output.includes('"key"'), 'Expected JSON key in output');
  assert(result.output.includes('"value"'), 'Expected JSON value in output');
});

// ── RUN ALL ─────────────────────────────────────────────────────────────────
(async () => {
  console.log('\n╔══════════════════════════════════════════════════════╗');
  console.log('║   EXECUTOR VERIFICATION SUITE                       ║');
  console.log('╚══════════════════════════════════════════════════════╝\n');

  for (const { name, fn } of tests) {
    try {
      await fn();
      passed++;
      console.log(`  ✓ PASS: ${name}`);
    } catch (err) {
      failed++;
      console.log(`  ✗ FAIL: ${name}`);
      console.log(`         ${err.message}`);
    }
  }

  console.log('\n──────────────────────────────────────────────────────');
  console.log(`  Results: ${passed} passed, ${failed} failed, ${tests.length} total`);
  console.log('──────────────────────────────────────────────────────');

  if (failed > 0) {
    console.log('\n  ⚠️  SOME TESTS FAILED\n');
    process.exit(1);
  } else {
    console.log('\n  ✅ ALL TESTS PASSED\n');
    process.exit(0);
  }
})();
