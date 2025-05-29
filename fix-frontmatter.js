import fs from 'fs/promises';
import { glob } from 'glob';


function fixFrontMatterQuotes(content) {
    const frontMatterMatch = content.match(/^---\n([\s\S]*?)\n---/);
    if (!frontMatterMatch) return content;

    let frontMatter = frontMatterMatch[1];

    // key: 'value' => key: "value"
    frontMatter = frontMatter.replace(
        /^([a-zA-Z0-9_-]+): '([^'\n\r"]*)'$/gm,
        (_, key, value) => `${key}: "${value}"`
    );

    // - 'item' => - "item"
    frontMatter = frontMatter.replace(
        /^(\s*)- '([^'\n\r"]*)'$/gm,
        (_, indent, value) => `${indent}- "${value}"`
    );

    const fixed = `---\n${frontMatter}\n---` + content.slice(frontMatterMatch[0].length);
    return fixed;
}

async function processFile(filePath) {
    const original = await fs.readFile(filePath, 'utf-8');
    const fixed = fixFrontMatterQuotes(original);
    if (original !== fixed) {
        await fs.writeFile(filePath, fixed, 'utf-8');
        console.log(`✅ Fixed: ${filePath}`);
    }
}

const rootDirs = ['./docs', 'blog', 'features', 'i18n']; // 修改为你的 Markdown 根目录
let total = 0;

for (const rootDir of rootDirs) {
  const files = await glob(`${rootDir}/**/*.md?(x)`);
  total += files.length;
  console.log(`📂 ${rootDir}: ${files.length} files`);
  await Promise.all(files.map(processFile));
}

console.log(`✅ Total files processed: ${total}`);

