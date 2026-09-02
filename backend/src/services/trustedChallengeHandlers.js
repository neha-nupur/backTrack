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
    const values = rawInput.split(',').map((value) => value.trim());
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
      if (typeof input[0] !== 'number' || typeof input[1] !== 'number') {
        return 'Invalid input type, please try again';
      }

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
      throw new Error('failed to process the input.'+error.message);
    }
  },

  PASTE_CHALLENGE_ID_2: function solution(input) {
    try {
      throw new Error('Add the second challenge solution here.');
    } catch (error) {
      throw new Error('Challenge 2 is not configured yet.');
    }
  },

  PASTE_CHALLENGE_ID_3: function solution(input) {
    try {
      throw new Error('Add the third challenge solution here.');
    } catch (error) {
      throw new Error('Challenge 3 is not configured yet.');
    }
  },

  PASTE_CHALLENGE_ID_4: function solution(input) {
    try {
      throw new Error('Add the fourth challenge solution here.');
    } catch (error) {
      throw new Error('Challenge 4 is not configured yet.');
    }
  },

  PASTE_CHALLENGE_ID_5: function solution(input) {
    try {
      throw new Error('Add the fifth challenge solution here.');
    } catch (error) {
      throw new Error('Challenge 5 is not configured yet.');
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

    return {
      success: true,
      input: parsedInput,
      output,
      error: null,
    };
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
