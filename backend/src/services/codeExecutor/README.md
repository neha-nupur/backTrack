# Controlled JavaScript Code Executor Boundary

> [!CAUTION]
> **HIGH RISK ARCHITECTURAL BOUNDARY**
> The code executor will execute administrator-configured hidden JavaScript logic against participant inputs.

## Future Architecture Specification
- **Service Directory**: `backend/src/services/codeExecutor/`
- **Modules**:
  - `executor.js`: Main execution controller handling timeout and resource cleanup.
  - `sandbox.js`: Isolated VM environment (using Node `vm` context with strict globals).
  - `validator.js`: Pre-execution validation checking logic syntax and forbidden tokens.
  - `errors.js`: Standardized execution error categories (timeout, memory, runtime, syntax).

## Security Constraints (Enforced in Future Phases)
1. **NO `eval()`**: Execution must use restricted vm context.
2. **NO Filesystem Access**: `fs`, `path`, and file I/O must be omitted from vm context.
3. **NO Process / Child Process Access**: `process`, `child_process`, `globalThis` leaks are forbidden.
4. **NO Network Access**: `fetch`, `http`, `net` modules must not be accessible.
5. **Strict Timeout**: Execution limit (e.g. 1000ms max per execution).
6. **Input / Output Payload Limits**: String size limits for participant input and returned output.
