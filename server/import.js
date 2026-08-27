import { readdirSync, readFileSync, writeFileSync, existsSync, statSync } from 'fs';
import { join, dirname, basename } from 'path';
import { fileURLToPath } from 'url';
import { randomUUID } from 'crypto';
import * as cheerio from 'cheerio';

const __dirname = dirname(fileURLToPath(import.meta.url));
const rootDir = join(__dirname, '..');
const dataPath = join(__dirname, 'data', 'notes.json');

const SKIP_DIRS = ['_resources', 'client', 'server', 'node_modules', '.git'];

function scanDirectory(dir, parentName = null) {
  const categories = [];
  const notes = [];

  const entries = readdirSync(dir);
  for (const entry of entries) {
    const fullPath = join(dir, entry);
    const stat = statSync(fullPath);

    if (stat.isDirectory()) {
      if (SKIP_DIRS.includes(entry) || entry === 'pluginAssets') continue;

      const catId = 'cat_' + randomUUID().slice(0, 8);
      categories.push({ id: catId, name: entry, parentId: parentName, order: categories.length });

      const sub = scanDirectory(fullPath, catId);
      categories.push(...sub.categories);
      notes.push(...sub.notes);
    }

    if (stat.isFile() && entry.endsWith('.html')) {
      const html = readFileSync(fullPath, 'utf-8');
      const $ = cheerio.load(html);

      const title = $('title').text() || basename(entry, '.html');
      let content = $('.exported-note').html() || $('body').html() || '';

      content = content.replace(/src="[^"]*_resources\//g, 'src="/resources/');

      notes.push({
        id: 'note_' + randomUUID().slice(0, 8),
        title,
        content,
        categoryId: parentName,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        order: notes.filter(n => n.categoryId === parentName).length
      });
    }
  }

  return { categories, notes };
}

console.log('Scanning knowledge base...');
const result = scanDirectory(rootDir);
console.log(`Found ${result.categories.length} categories, ${result.notes.length} notes`);

if (existsSync(dataPath)) {
  const existing = JSON.parse(readFileSync(dataPath, 'utf-8'));
  if (existing.notes.length > 0) {
    console.log('Data already exists, skipping import. Delete data/notes.json to re-import.');
    process.exit(0);
  }
}

writeFileSync(dataPath, JSON.stringify(result, null, 2));
console.log('Import complete! Data saved to data/notes.json');
