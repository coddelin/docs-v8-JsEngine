const fs = require('fs');
const path = require('path');

const BLOG_DIR = path.join(__dirname, 'blog');
const TRUNCATE_MARK = '<!--truncate-->';
const PARAGRAPH_CHAR_LIMIT = 200;

// 遍历目录，收集所有 md/mdx 文件
function walk(dir, fileList = []) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);
    if (stat.isDirectory()) {
      walk(fullPath, fileList);
    } else if (file.endsWith('.md') || file.endsWith('.mdx')) {
      fileList.push(fullPath);
    }
  }
  return fileList;
}

// 插入 truncate 标记
function insertTruncate(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');

  if (content.includes(TRUNCATE_MARK)) {
    console.log(`✅ Skip (already truncated): ${filePath}`);
    return;
  }

  const lines = content.split('\n');
  let insideFrontMatter = false;
  let buffer = [];
  let paragraphStart = -1;
  let paragraphEnd = -1;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    const trimmed = line.trim();

    // Front matter start/end
    if (trimmed === '---') {
      insideFrontMatter = !insideFrontMatter;
      continue;
    }

    if (insideFrontMatter) continue;

    // 段落开始
    if (paragraphStart === -1 && trimmed !== '') {
      paragraphStart = i;
    }

    // 段落内容收集
    if (paragraphStart !== -1) {
      buffer.push(line);
    }

    // 段落结束（遇到空行或文件末尾）
    const isLastLine = i === lines.length - 1;
    if ((trimmed === '' && paragraphStart !== -1) || isLastLine) {
      paragraphEnd = isLastLine ? i + 1 : i;

      // 合并段落文本并去除空白
      const paragraphText = buffer.join('\n').replace(/\s+/g, '');

      if (paragraphText.length >= PARAGRAPH_CHAR_LIMIT) {
        lines.splice(paragraphEnd + 1, 0, TRUNCATE_MARK);
        fs.writeFileSync(filePath, lines.join('\n'), 'utf8');
        console.log(`✂️  Inserted truncate after long paragraph in: ${filePath}`);
        return;
      }

      // 重置状态，继续下一个段落
      buffer = [];
      paragraphStart = -1;
    }
  }

  console.log(`⚠️  No suitable long paragraph found in: ${filePath}`);
}

// 主流程
const blogFiles = walk(BLOG_DIR);
blogFiles.forEach(insertTruncate);
