// 有效
import fs from 'fs/promises';
import { glob } from 'glob';

const rootDirs = ['./docs', 'blog', 'features', 'i18n'];

function isQuoteWrapped(str) {
  return (/^["'].*["']$/s).test(str.trim());
}

function isLikelyScalar(str) {
  return (/^(true|false|null|[\d.e+-]+)$/i).test(str.trim());
}

function quoteIfNeeded(val) {
  const trimmed = val.trim();

  // 空、嵌套结构开始、数组项 → 不处理
  if (trimmed === '' || trimmed.startsWith('-') || trimmed.endsWith(':')) {
    return val;
  }

  // 单引号包裹 → 替换为双引号
  if (trimmed.startsWith("'") && trimmed.endsWith("'")) {
    const inner = trimmed.slice(1, -1).replace(/"/g, '\\"');
    return `"${inner}"`;
  }

  // 未包裹也不是标量 → 包上双引号
  if (!isQuoteWrapped(trimmed) && !isLikelyScalar(trimmed)) {
    return `"${trimmed.replace(/"/g, '\\"')}"`;
  }

  return val;
}

function fixFrontMatter(content) {
  const match = /^---\n([\s\S]*?)\n---\n?/m.exec(content);
  if (!match) return null;

  const front = match[1];
  const lines = front.split('\n');
  const fixedLines = [];

  for (let line of lines) {
    // 跳过空行
    if (line.trim() === '') {
      fixedLines.push(line);
      continue;
    }

    const kvMatch = /^(\s*[^:]+):\s*(.*)$/.exec(line);
    if (!kvMatch) {
      fixedLines.push(line); // 嵌套、数组等保留
      continue;
    }

    const [, key, val] = kvMatch;
    const newVal = quoteIfNeeded(val);
    fixedLines.push(`${key}: ${newVal}`);
  }

  const fixedFront = `---\n${fixedLines.join('\n')}\n---\n`;
  const rest = content.slice(match[0].length);
  return fixedFront + rest;
}

async function processFile(filePath) {
  const original = await fs.readFile(filePath, 'utf8');
  const fixed = fixFrontMatter(original);

  if (fixed && fixed !== original) {
    await fs.writeFile(filePath, fixed, 'utf8');
    console.log(`✅ Fixed: ${filePath}`);
  }
}

async function main() {
  for (const rootDir of rootDirs) {
    const files = await glob(`${rootDir}/**/*.md?(x)`);
    for (const file of files) {
      await processFile(file);
    }
  }
}

main();
