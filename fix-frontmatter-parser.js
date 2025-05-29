//npm install js-yaml gray-matter glob
import fs from 'fs/promises';
import { glob } from 'glob';
import matter from 'gray-matter';
import yaml from 'js-yaml';

const rootDirs = ['./docs', 'blog', 'features', 'i18n'];

async function processFile(filePath) {
  const original = await fs.readFile(filePath, 'utf8');
  let parsed;
  try {
    parsed = matter(original, { language: 'yaml' });
  } catch (err) {
    console.error(`❌ YAML parse failed: ${filePath}`);
    console.error(`→ ${err.reason} at line ${err.mark?.line + 1}, column ${err.mark?.column}`);
    return;
  }

  const newYaml = yaml.dump(parsed.data, {
    lineWidth: 1000,
    quotingType: '"',
    forceQuotes: true,
  });

  const rebuilt = `---\n${newYaml}---\n${parsed.content}`;
  if (rebuilt !== original) {
    await fs.writeFile(filePath, rebuilt, 'utf8');
    console.log(`✅ Fixed: ${filePath}`);
  }
}

for (const rootDir of rootDirs) {
  const files = await glob(`${rootDir}/**/*.md?(x)`);
  console.log(`📂 ${rootDir}: ${files.length} files`);
  await Promise.all(files.map(processFile));
}