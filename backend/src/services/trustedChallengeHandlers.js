'use strict';

const parseInput = (userInput) => {
  if (Array.isArray(userInput)) return userInput;
  if (userInput === null || userInput === undefined) {
    throw new Error('Input is required.');
  }

  const rawInput = String(userInput).trim();
  if (!rawInput) throw new Error('Input is required.');

  try {
    const parsedInput = JSON.parse(rawInput);
    return Array.isArray(parsedInput) ? parsedInput : [parsedInput];
  } catch (error) {
    const values = rawInput.split('   ').map((value) => value.trim());
    return values.map((value) => {
      const numericValue = Number(value);
      return value !== '' && Number.isFinite(numericValue) ? numericValue : value;
    });
  }
};

const challengeHandlers = {
  challenge_6a92f09d9c126adee1de5c1b: function solution(input) {
    try {
      if (input.length !== 2) return 'Enter valid no of arguments';
      if (typeof input[0] !== 'number' || typeof input[1] !== 'number') return 'Invalid input type, please try again';
      let a = input[0];
      const b = input[1];
      a = ((a % b) + b) % b;
      let [oldR, r] = [a, b];
      let [oldS, s] = [1, 0];
      while (r !== 0) {
        const quotient = Math.floor(oldR / r);
        [oldR, r] = [r, oldR - quotient * r];
        [oldS, s] = [s, oldS - quotient * s];
      }
      if (oldR !== 1) return -1;
      return ((oldS % b) + b) % b;
    } catch (error) {
      throw new Error('failed to process the input.');
    }
  },

  challenge_6a92f01c9c126adee1de5c05: function solution(input) {
    try {
      const value = String(input[0]);
      if (!/^[a-zA-Z0-9]+$/.test(value)) return 'Invalid input type, please try again';
      const chars = value.split('');
      const n = chars.length;
      for (let i = 0; i < Math.floor(n / 2); i++) {
        const j = n - 1 - i;
        const left = chars[i].charCodeAt(0);
        const right = chars[j].charCodeAt(0);
        chars[i] = String.fromCharCode((right + 1) % 128);
        chars[j] = String.fromCharCode((left + 127) % 128);
      }
      return chars.join('');
    } catch (error) {
      throw new Error('failed to process the input.');
    }
  },

  challenge_6a92ed049c126adee1de5bfd: function solution(input) {
    try {
      const value = input[0];
      if (typeof value !== 'number') return 'Invalid input type, please try again';
      if (value < 0 || value > 45) return 'Exceeds the given constraint';
      let a = 0;
      let b = 1;
      for (let i = 1; i <= value; i++) {
        const c = a + b;
        a = b;
        b = c;
      }
      return a.toString(2);
    } catch (error) {
      throw new Error('failed to process the input.');
    }
  },

  challenge_6a92bf5dbebcb82f2e693f68: function solution(input) {
    try {
      if (input.length !== 2) return 'Enter valid no of arguments';
      if (typeof input[0] !== 'number' || typeof input[1] !== 'number') return 'Invalid input type, please try again';
      const a = input[0];
      const b = input[1];
      if (a > 10000 || a < -10000 || b > 10000 || b < -10000) return 'Exceeds the given Constraint';
      let sum = 0;
      for (let i = Math.min(a, b) + 1; i < Math.max(a, b); i++) sum += i;
      return sum;
    } catch (error) {
      throw new Error('failed to process the input.');
    }
  },

  challenge_6a92b62006b0920c9b14214b: function solution(input) {
    try {
      if (input.length !== 2) return 'Enter valid no of arguments';
      if (typeof input[0] !== 'number' || typeof input[1] !== 'number') return 'Invalid input type, Try again!';
      if (input[0] > 10000 || input[0] < -10000 || input[1] > 10000 || input[1] < -10000) return 'Exceeds the given Constraint';
      return Math.max(input[0] ** 2, input[1] ** 2);
    } catch (error) {
      throw new Error('failed to process the input.');
    }
  },
};

const executeTrustedChallenge = (challengeId, userInput) => {
  const handler = challengeHandlers[challengeId];
  const input = userInput;

  if (!handler) {
    return {
      success: false,
      input,
      output: null,
      error: {
        code: 'CHALLENGE_HANDLER_NOT_FOUND',
        message: 'No handler is configured for this challenge.',
      },
    };
  }

  try {
    const parsedInput = parseInput(userInput);
    const output = handler(parsedInput);
    return { success: true, input: parsedInput, output, error: null };
  } catch (error) {
    return {
      success: false,
      input,
      output: null,
      error: {
        code: 'CHALLENGE_EXECUTION_ERROR',
        message: error instanceof Error ? error.message : 'Challenge execution failed.',
      },
    };
  }
};

module.exports = {
  challengeHandlers,
  executeTrustedChallenge,
};
