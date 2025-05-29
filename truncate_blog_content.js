
const fs = require('fs');
const path = require('path');

const BLOG_DIR = path.join(__dirname, 'blog');
const TRUNCATE_MARK = '<!--truncate-->';

// 遍历目录
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

  // 查找第一个空行作为段落分隔
  const lines = content.split('\n');
  const insertIndex = lines.findIndex((line, index) =>
    line.trim() === '' && index > 0 && lines[index - 1].trim() !== ''
  );

  if (insertIndex !== -1) {
    lines.splice(insertIndex + 1, 0, TRUNCATE_MARK);
    fs.writeFileSync(filePath, lines.join('\n'), 'utf8');
    console.log(`✂️  Inserted truncate in: ${filePath}`);
  } else {
    console.log(`⚠️  No suitable place to insert truncate in: ${filePath}`);
  }
}

// 主流程
const blogFiles = walk(BLOG_DIR);
blogFiles.forEach(insertTruncate);
