import fs from 'fs';
import path from 'path';
import glob from 'glob';

const rootDir = './docs'; // 替换为你的目录路径

// 替换 front matter 中单引号包裹的字段为双引号
function fixFrontMatterQuotes(content: string): string {
  const frontMatterMatch = content.match(/^---\n([\s\S]*?)\n---/);
  if (!frontMatterMatch) return content;

  let frontMatter = frontMatterMatch[1];

  // 替换形如 key: 'value' 的内容为 key: "value"，注意跳过包含双引号的值
  frontMatter = frontMatter.replace(
    /^([a-zA-Z0-9_-]+): '([^'\n\r"]*)'$/gm,
    (_, key, value) => `${key}: "${value}"`
  );

  const fixed = `---\n${frontMatter}\n---` + content.slice(frontMatterMatch[0].length);
  return fixed;
}

function processFile(filePath: string) {
  const original = fs.readFileSync(filePath, 'utf-8');
  const fixed = fixFrontMatterQuotes(original);
  if (original !== fixed) {
    fs.writeFileSync(filePath, fixed, 'utf-8');
    console.log(`✅ Fixed: ${filePath}`);
  }
}

glob(`${rootDir}/**/*.md?(x)`, (err, files) => {
  if (err) throw err;
  files.forEach(processFile);
});
