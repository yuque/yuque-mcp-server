import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { userTools } from '../../src/tools/user.js';
import { bookTools } from '../../src/tools/book.js';
import { docTools } from '../../src/tools/doc.js';
import { tocTools } from '../../src/tools/toc.js';
import { searchTools } from '../../src/tools/search.js';
import { noteTools } from '../../src/tools/note.js';
import { resourceTools } from '../../src/tools/resource.js';

const registeredToolNames = Object.keys({
  ...userTools,
  ...bookTools,
  ...docTools,
  ...tocTools,
  ...searchTools,
  ...noteTools,
  ...resourceTools,
}).sort();

// READMEs that list the public tool surface. Each must show the exact tool
// count and name every registered tool (and nothing else) inside its tools
// section. docs/capability-scope.md has its own lock in
// tests/mcp/capability-scope-docs.test.ts.
const docContracts = [
  {
    file: 'README.md',
    countPattern: /^## Tools \((\d+)\)$/m,
    sectionHeading: '## Tools (',
  },
  {
    file: 'README.zh-CN.md',
    countPattern: /^## 工具列表（(\d+) 个）$/m,
    sectionHeading: '## 工具列表（',
  },
];

function readRepoFile(relativePath: string): string {
  return readFileSync(fileURLToPath(new URL(`../../${relativePath}`, import.meta.url)), 'utf-8');
}

function extractSection(content: string, heading: string): string {
  const start = content.indexOf(heading);
  if (start === -1) throw new Error(`Heading not found: ${heading}`);
  const rest = content.slice(start + heading.length);
  const nextHeading = rest.search(/^## /m);
  return nextHeading === -1 ? rest : rest.slice(0, nextHeading);
}

function extractToolNames(section: string): string[] {
  const names = [...section.matchAll(/`(yuque_[a-z_]+)`/g)].map((match) => match[1]);
  return [...new Set(names)].sort();
}

describe('tool surface documentation contract', () => {
  for (const contract of docContracts) {
    it(`${contract.file} lists the complete tool surface`, () => {
      const content = readRepoFile(contract.file);

      const countMatch = content.match(contract.countPattern);
      if (!countMatch) throw new Error(`Tool count marker missing in ${contract.file}`);
      expect(Number(countMatch[1])).toBe(registeredToolNames.length);

      const section = extractSection(content, contract.sectionHeading);
      expect(extractToolNames(section)).toEqual(registeredToolNames);
    });
  }
});
