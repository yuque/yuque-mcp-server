# Contributing to Yuque MCP Server

Thank you for your interest in contributing! 🎉

## Quick Start

```bash
# Clone and install
git clone https://github.com/yuque/yuque-mcp-server.git
cd yuque-mcp-server
npm install

# Run tests
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
5. Ensure all checks pass:
   ```bash
   npm run lint
   npm run typecheck
   npm test
   npm run build
   ```
6. Commit with conventional commit messages
7. Submit a pull request

## Project Structure

```
src/
├── cli.ts              # CLI entry point
├── index.ts            # Server setup and tool registration
├── services/
│   └── yuque-client.ts # Yuque API client
├── tools/
│   ├── doc.ts          # Document tools (CRUD)
│   ├── group.ts        # Group/team tools
│   ├── repo.ts         # Repository tools (CRUD)
│   ├── search.ts       # Search tool
│   ├── stats.ts        # Statistics tools
│   ├── toc.ts          # Table of contents tools
│   ├── user.ts         # User tools
│   └── version.ts      # Document version tools
└── utils/
    ├── error.ts        # Error handling
    └── format.ts       # Response formatting
```

## Adding a New Tool

1. Add the API method to `src/services/yuque-client.ts`
2. Create or update the tool definition in `src/tools/`
3. Register the tool in `src/index.ts`
4. Add tests in `tests/`
5. Update README.md with the new tool

## Coding Standards

- TypeScript with strict mode enabled
- Use Zod for input validation schemas
- Follow existing code patterns for consistency
- Format responses for minimal token usage (AI-optimized)
- All public APIs must have JSDoc comments

## Testing

We use [Vitest](https://vitest.dev/) for testing.

```bash
# Run all tests
npm test

# Run with coverage
npm run test:coverage

# Run specific test file
npx vitest --run tests/services/yuque-client.test.ts
```

## Commit Messages

Follow [Conventional Commits](https://www.conventionalcommits.org/):

- `feat:` — New feature
- `fix:` — Bug fix
- `docs:` — Documentation only
- `test:` — Adding or updating tests
- `chore:` — Maintenance, dependencies
- `refactor:` — Code change that neither fixes a bug nor adds a feature

## Docker

Build and run with Docker:

```bash
docker build -t yuque-mcp .
docker run --rm -i -e YUQUE_PERSONAL_TOKEN=your_token yuque-mcp
# or
docker run --rm -i -e YUQUE_PERSONAL_TOKEN=your_token yuque-mcp
```

## Questions?

Open an issue or start a discussion. We're happy to help!
