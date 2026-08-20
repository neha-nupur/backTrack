/**
 * Evaluation Service
 * 
 * Handles output normalization, correctness determination, and scoring.
 * 
 * 
 * NOTE: The BlackBox platform does not currently store "expected outputs" or
 * test cases for challenges. The platform acts solely as a black-box 
 * logic executor. Participants observe the output and solve the actual
 * problem on HackerRank.
 * 
 * Therefore, we cannot automatically evaluate "correctness". 
 * For all attempts, `isCorrect` will default to `null` and `score` to `0`.
 */

/**
 * Normalizes output string (removes trailing whitespace/newlines).
 * @param {string} output - The execution output
 * @returns {string} - Normalized output
 */
const normalizeOutput = (output) => {
  if (typeof output !== 'string') return '';
  return output.replace(/\r\n/g, '\n').trim();
};

/**
 * Evaluates the execution output against the challenge.
 * (Currently acts as a pass-through due to spec limitations).
 * 
 * @param {string} output - The participant's execution output
 * @param {object} challenge - The Challenge document
 * @param {boolean} executionSuccess - Whether the execution succeeded
 * @returns {{ isCorrect: boolean|null, score: number, normalizedOutput: string }}
 */
const evaluateOutput = (output, challenge, executionSuccess) => {
  const normalizedOutput = normalizeOutput(output);
  
  if (!executionSuccess) {
    return {
      isCorrect: false, // Execution failed (timeout/error), explicitly incorrect
      score: 0,
      normalizedOutput
    };
  }

  // Cannot verify logical correctness. We return null to indicate "Evaluation Not Applicable".
  return {
    isCorrect: null,
    score: 0,
    normalizedOutput
  };
};

module.exports = {
  normalizeOutput,
  evaluateOutput
};
