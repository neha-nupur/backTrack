/**
 * Infers the Input and Output format based on the hidden JavaScript code.
 * Used to give participants clear instructions without leaking the actual logic.
 *
 * @param {string} hiddenCode - The hidden black-box JavaScript code
 * @param {string} fallbackInput - The fallback input format from the DB
 * @param {string} fallbackOutput - The fallback output format from the DB
 * @returns {{inputFormat: string, outputFormat: string}}
 */
const deriveIOFormat = (hiddenCode, fallbackInput, fallbackOutput) => {
  if (!hiddenCode) return { inputFormat: fallbackInput, outputFormat: fallbackOutput };

  let inferredInput = [];
  let inferredOutput = [];

  // 1. Find the main function signature
  const fnMatch = hiddenCode.match(/function\s+[a-zA-Z0-9_$]+\s*\(([^)]*)\)/);
  const args = fnMatch && fnMatch[1].trim() ? fnMatch[1].split(',').map(a => a.trim()) : [];

  const fnNameMatch = hiddenCode.match(/function\s+([a-zA-Z0-9_$]+)\s*\(/);
  const fnName = fnNameMatch ? fnNameMatch[1] : '';

  if (fnName === 'twoSum') {
    inferredInput = [
      'Array of integers (e.g., [2,7,11,15] or separated by spaces/newlines)',
      'Target integer (e.g., 9)'
    ];
    inferredOutput = ['Array containing the two indices'];
  } else if (fnName === 'isValid') {
    inferredInput = ['String containing bracket characters ()[]{}'];
    inferredOutput = ['Boolean (true/false) indicating if brackets are valid'];
  } else if (args.length > 0) {
    args.forEach(arg => {
      const lowerArg = arg.toLowerCase();
      // Basic heuristic based on argument name and assertions in code
      if (lowerArg.includes('num') || lowerArg.includes('arr') || lowerArg === 'a') {
        if (hiddenCode.includes(`${arg} must be an array`) || hiddenCode.includes(`Array.isArray(${arg})`)) {
           inferredInput.push(`Array of integers (${arg})`);
        } else if (hiddenCode.includes(`typeof ${arg} == "number"`) || hiddenCode.includes(`typeof(${arg}) == 'number'`)) {
           inferredInput.push(`Integer / Number (${arg})`);
        } else if (lowerArg.includes('nums')) {
           inferredInput.push(`Array of numbers (${arg})`);
        } else if (lowerArg === 'target' || lowerArg === 'b') {
           inferredInput.push(`Number (${arg})`);
        } else {
           inferredInput.push(`Value for ${arg}`);
        }
      } else if (lowerArg === 's' || lowerArg.includes('str')) {
        inferredInput.push(`String (${arg})`);
      } else if (lowerArg === 'input') {
        if (hiddenCode.includes(`typeof ${arg} == "number"`) || hiddenCode.includes(`typeof(${arg}) == 'number'`) || hiddenCode.includes(`typeof(${arg}) != "number"`)) {
           inferredInput.push(`Integer`);
        } else if (hiddenCode.includes('.test(') && hiddenCode.includes('^[a-zA-Z0-9]+$')) {
           inferredInput.push(`Alphanumeric string`);
        } else {
           inferredInput.push(`Any value (String, Number, Array, etc.)`);
        }
      } else {
        inferredInput.push(arg);
      }
    });
  } else {
    inferredInput.push("No input required");
  }

  // 2. Determine output format from return statements
  if (inferredOutput.length === 0) {
    if (hiddenCode.includes('return input;') || hiddenCode.includes('return a;')) {
      inferredOutput.push('Dynamic (Depends on input type)');
    } else if (hiddenCode.includes('return [') || hiddenCode.includes('return Array')) {
      inferredOutput.push('Array');
    } else if (hiddenCode.includes('return false') || hiddenCode.includes('return true') || hiddenCode.includes('return stack.length === 0') || hiddenCode.includes('return !')) {
      inferredOutput.push('Boolean (true/false)');
    } else if (hiddenCode.includes('return total') || hiddenCode.includes('return fact') || hiddenCode.includes('return Math.min') || hiddenCode.includes('return (a+b)')) {
      inferredOutput.push('Integer / Number');
    } else if (hiddenCode.includes('return maxChar') || hiddenCode.includes('return input.toString(2)')) {
      inferredOutput.push('String');
    } else {
      inferredOutput.push('Output returned by the black box');
    }
  }

  // Ensure arrays have elements
  const formatInput = inferredInput.length > 0 ? inferredInput.map(i => `- ${i}`).join('\n') : fallbackInput;
  const formatOutput = inferredOutput.length > 0 ? inferredOutput.map(o => `- ${o}`).join('\n') : fallbackOutput;

  return { 
    inputFormat: formatInput || fallbackInput, 
    outputFormat: formatOutput || fallbackOutput 
  };
};

module.exports = { deriveIOFormat };
