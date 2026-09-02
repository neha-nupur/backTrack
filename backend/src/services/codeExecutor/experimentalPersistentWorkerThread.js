'use strict';

const { parentPort } = require('worker_threads');
const vm = require('vm');

const challengeScripts = new Map();
const invocationScript = new vm.Script('__runChallenge(userInput, userInput, console)');

const makeContext = (outputBuffer, runChallenge, userInput) => vm.createContext({
  console: {
    log: (...values) => outputBuffer.push(values.map(value => {
      if (typeof value === 'object' && value !== null) return JSON.stringify(value);
      return String(value);
    }).join(' ')),
  },
  Math,
  Date,
  JSON,
  Number,
  String,
  Boolean,
  Array,
  Object,
  Map,
  Set,
  parseInt,
  parseFloat,
  isNaN,
  isFinite,
  __runChallenge: runChallenge,
  userInput,
});

const compileChallenge = hiddenCode => {
  // The compiled function is created once per challenge in this persistent worker.
  return new vm.Script(`(function runChallenge(userInput, input, console) {\n${hiddenCode}\n})`, {
    filename: 'experimental-challenge.vm.js',
  });
};

parentPort.postMessage({ type: 'ready' });

parentPort.on('message', message => {
  if (message.type === 'load') {
    try {
      challengeScripts.set(message.challengeId, compileChallenge(message.hiddenCode));
      parentPort.postMessage({ type: 'loaded', challengeId: message.challengeId });
    } catch (error) {
      parentPort.postMessage({
        type: 'loaded',
        challengeId: message.challengeId,
        error: { code: 'SYNTAX_ERROR', message: 'Challenge could not be compiled.' },
      });
    }
    return;
  }

  if (message.type !== 'execute') return;

  const outputBuffer = [];
  const script = challengeScripts.get(message.challengeId);

  if (!script) {
    parentPort.postMessage({
      jobId: message.jobId,
      result: {
        success: false,
        output: '',
        error: { code: 'CHALLENGE_NOT_LOADED', message: 'Challenge is not loaded.' },
      },
    });
    return;
  }

  try {
    const compileContext = makeContext([], undefined, '');
    const runChallenge = script.runInContext(compileContext, { timeout: message.timeoutMs });
    const context = makeContext(outputBuffer, runChallenge, message.userInput);
    invocationScript.runInContext(context, { timeout: message.timeoutMs });
    const output = outputBuffer.join('\n');

    parentPort.postMessage({
      jobId: message.jobId,
      result: output
        ? { success: true, output, error: null }
        : { success: false, output: '', error: { code: 'NO_OUTPUT', message: 'No output.' } },
    });
  } catch (error) {
    const timedOut = error.code === 'ERR_SCRIPT_EXECUTION_TIMEOUT' || /timed out/i.test(error.message || '');
    parentPort.postMessage({
      jobId: message.jobId,
      result: {
        success: false,
        output: outputBuffer.join('\n'),
        error: {
          code: timedOut ? 'EXECUTION_TIMEOUT' : 'RUNTIME_ERROR',
          message: timedOut ? 'Execution timed out.' : String(error.message || 'Runtime error').slice(0, 200),
        },
      },
    });
  }
});
