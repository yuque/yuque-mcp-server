# Contributing to Yuque MCP Server

Thank you for your interest in contributing! 🎉

## Quick Start

```bash
# Clone and install
git clone https://github.com/yuque/yuque-mcp-server.git
cd yuque-mcp-server
npm install

# Run tests (single run; use npm run test:watch for watch mode)
npm test

# Type check
npm run typecheck

# Lint
npm run lint

# Build
npm run build
```

## Development Workflow

1. Fork the repository
2. Create a feature branch: `git checkout -b feat/my-feature`
3. Make your changes
4. Add tests for new functionality
5. Ensure the quality gate passes (same command CI runs):
   ```bash
   npm run check
   ```
6. Commit with conventional commit messages
7. Submit a pull request

## Project Structure

The authoritative description of entry points, layers, and data flow lives in
[docs/core-architecture.md](./docs/core-architecture.md). Start with the reading
order in [docs/README.md](./docs/README.md) — those documents are maintained in
sync with the code, so this file intentionally does not duplicate them.

## Adding a New Tool

1. Add the API method to `src/services/yuque-client.ts` (and its types to `src/services/types.ts`)
2. Add the tool definition (`description`, `inputSchema`, `handler`) in the matching domain file under `src/tools/`
3. If you created a new domain file, merge its tools in `src/server.ts`
4. Add tests in `tests/tools/` and update the contract in `tests/mcp/tool-registry-contract.test.ts`
5. Update [docs/capability-scope.md](./docs/capability-scope.md) following the maintenance rules in [AGENTS.md](./AGENTS.md)

## Coding Standards

- TypeScript with strict mode enabled
- Use Zod for input validation schemas
- Follow existing code patterns for consistency
- Format responses for minimal token usage (AI-optimized)
- All public APIs must have JSDoc comments

## Testing

We use [Vitest](https://vitest.dev/) for testing.

```bash
# Run all tests once
npm test

# Watch mode
npm run test:watch

# Run with coverage
npm run test:coverage

# Run specific test file
npx vitest run tests/services/yuque-client.test.ts
```

Real Yuque API smoke tests are skipped by default; see
[docs/technical-stack.md](./docs/technical-stack.md) for the environment
variables that enable them.

## Commit Messages

Follow [Conventional Commits](https://www.conventionalcommits.org/):

- `feat:` — New feature
- `fix:` — Bug fix
- `docs:` — Documentation only
- `test:` — Adding or updating tests
- `chore:` — Maintenance, dependencies
- `refactor:` — Code change that neither fixes a bug nor adds a feature

## Questions?

Open an issue or start a discussion. We're happy to help!
