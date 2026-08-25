const { execute } = require('./src/services/codeExecutor/executor');

const hiddenCode = `function isValid(s) {
    const stack = [];
    const matching = {
        ")": "(",
        "}": "{",
        "]": "["
    };
    for (const ch of s) {
        if (ch === "(" || ch === "{" || ch === "[") {
            stack.push(ch);
        } else if (ch === ")" || ch === "}" || ch === "]") {
            if (stack.length === 0) return false;
            if (stack.pop() !== matching[ch]) return false;
        }
    }
    return stack.length === 0;
}`;

async function run() {
  const r1 = await execute(hiddenCode, '()');
  console.log('Test 1 - "()":', JSON.stringify(r1));

  const r2 = await execute(hiddenCode, '()[]{}');
  console.log('Test 2 - "()[]{}":', JSON.stringify(r2));

  const r3 = await execute(hiddenCode, '(]');
  console.log('Test 3 - "(]":', JSON.stringify(r3));
}

run().catch(console.error);
