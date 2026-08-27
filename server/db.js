import Database from 'better-sqlite3';
import { existsSync, mkdirSync, readFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const dataDir = join(__dirname, 'data');
const dbPath = join(dataDir, 'app.sqlite');

if (!existsSync(dataDir)) mkdirSync(dataDir, { recursive: true });

export const db = new Database(dbPath);
db.pragma('journal_mode = WAL');
db.pragma('synchronous = NORMAL');
db.pragma('foreign_keys = ON');

db.exec(`
CREATE TABLE IF NOT EXISTS categories (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  icon TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  parent_id TEXT
);

CREATE TABLE IF NOT EXISTS notes (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  content TEXT NOT NULL DEFAULT '',
  category_id TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  pinned INTEGER NOT NULL DEFAULT 0,
  deleted_at TEXT,
  tags_json TEXT NOT NULL DEFAULT '[]',
  ai_summary TEXT
);

CREATE INDEX IF NOT EXISTS idx_notes_deleted_updated ON notes(deleted_at, updated_at);
CREATE INDEX IF NOT EXISTS idx_notes_category_order ON notes(category_id, sort_order);
CREATE INDEX IF NOT EXISTS idx_notes_pinned ON notes(pinned);

CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value_json TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS ai_providers (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  type TEXT NOT NULL,
  base_url TEXT NOT NULL,
  api_key TEXT NOT NULL,
  models_json TEXT NOT NULL DEFAULT '[]'
);

CREATE TABLE IF NOT EXISTS ai_state (
  key TEXT PRIMARY KEY,
  value TEXT
);
`);

// 幂等迁移: notes 增加 type 字段 ('rich' 富文本 | 'html' 原样嵌入)
const noteColumns = db.prepare("PRAGMA table_info(notes)").all();
if (!noteColumns.some(col => col.name === 'type')) {
  db.exec("ALTER TABLE notes ADD COLUMN type TEXT NOT NULL DEFAULT 'rich'");
}

function parseJson(value, fallback) {
  if (!value) return fallback;
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
}

function toBool(value) {
  return value ? true : false;
}

export function mapCategory(row) {
  if (!row) return null;
  return {
    id: row.id,
    name: row.name,
    icon: row.icon || '📁',
    order: row.sort_order,
    parentId: row.parent_id || null
  };
}

export function mapNote(row, includeContent = true) {
  if (!row) return null;
  const note = {
    id: row.id,
    title: row.title,
    categoryId: row.category_id || null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    order: row.sort_order,
    pinned: toBool(row.pinned),
    type: row.type || 'rich',
    tags: parseJson(row.tags_json, []),
    aiSummary: row.ai_summary || undefined
  };
  if (row.deleted_at) note.deletedAt = row.deleted_at;
  if (includeContent) note.content = row.content || '';
  return note;
}

export function getSetting(key, fallback = null) {
  const row = db.prepare('SELECT value_json FROM settings WHERE key = ?').get(key);
  return row ? parseJson(row.value_json, fallback) : fallback;
}

export function setSetting(key, value) {
  db.prepare(`
    INSERT INTO settings (key, value_json)
    VALUES (?, ?)
    ON CONFLICT(key) DO UPDATE SET value_json = excluded.value_json
  `).run(key, JSON.stringify(value));
}

export function getSettingsObject() {
  return getSetting('ui', {});
}

export function saveSettingsObject(settings) {
  setSetting('ui', settings || {});
}

export function getAiState(key, fallback = null) {
  const row = db.prepare('SELECT value FROM ai_state WHERE key = ?').get(key);
  return row?.value ?? fallback;
}

export function setAiState(key, value) {
  db.prepare(`
    INSERT INTO ai_state (key, value)
    VALUES (?, ?)
    ON CONFLICT(key) DO UPDATE SET value = excluded.value
  `).run(key, value ?? null);
}

export function getAiConfig() {
  const providers = db.prepare('SELECT * FROM ai_providers ORDER BY rowid ASC').all().map(row => ({
    id: row.id,
    name: row.name,
    type: row.type,
    baseUrl: row.base_url,
    apiKey: row.api_key,
    models: parseJson(row.models_json, [])
  }));
  return {
    providers,
    activeProviderId: getAiState('activeProviderId', null),
    activeModel: getAiState('activeModel', null)
  };
}

export function replaceAiConfig(config) {
  const tx = db.transaction(() => {
    db.prepare('DELETE FROM ai_providers').run();
    const insert = db.prepare(`
      INSERT INTO ai_providers (id, name, type, base_url, api_key, models_json)
      VALUES (@id, @name, @type, @baseUrl, @apiKey, @modelsJson)
    `);
    for (const provider of config.providers || []) {
      insert.run({
        ...provider,
        modelsJson: JSON.stringify(provider.models || [])
      });
    }
    setAiState('activeProviderId', config.activeProviderId || null);
    setAiState('activeModel', config.activeModel || null);
  });
  tx();
}

export function importJsonDataIfEmpty() {
  const count = db.prepare('SELECT COUNT(*) AS count FROM notes').get().count;
  if (count > 0) return { imported: false, reason: 'sqlite-not-empty' };

  const notesPath = join(dataDir, 'notes.json');
  const settingsPath = join(dataDir, 'settings.json');
  const aiConfigPath = join(dataDir, 'ai-config.json');

  const notesData = existsSync(notesPath)
    ? JSON.parse(readFileSync(notesPath, 'utf-8'))
    : { categories: [], notes: [] };

  const tx = db.transaction(() => {
    const insertCat = db.prepare(`
      INSERT OR REPLACE INTO categories (id, name, icon, sort_order, parent_id)
      VALUES (@id, @name, @icon, @sortOrder, @parentId)
    `);
    for (const category of notesData.categories || []) {
      insertCat.run({
        id: category.id,
        name: category.name || '未命名分类',
        icon: category.icon || '📁',
        sortOrder: category.order ?? 0,
        parentId: category.parentId || null
      });
    }

    const insertNote = db.prepare(`
      INSERT OR REPLACE INTO notes (
        id, title, content, category_id, created_at, updated_at, sort_order,
        pinned, deleted_at, tags_json, ai_summary, type
      )
      VALUES (
        @id, @title, @content, @categoryId, @createdAt, @updatedAt, @sortOrder,
        @pinned, @deletedAt, @tagsJson, @aiSummary, @type
      )
    `);
    for (const note of notesData.notes || []) {
      const now = new Date().toISOString();
      insertNote.run({
        id: note.id,
        title: note.title || '无标题',
        content: note.content || '',
        categoryId: note.categoryId || null,
        createdAt: note.createdAt || now,
        updatedAt: note.updatedAt || now,
        sortOrder: note.order ?? 0,
        pinned: note.pinned ? 1 : 0,
        deletedAt: note.deletedAt || null,
        tagsJson: JSON.stringify(note.tags || []),
        aiSummary: note.aiSummary || null,
        type: note.type === 'html' ? 'html' : 'rich'
      });
    }

    if (existsSync(settingsPath)) {
      try {
        saveSettingsObject(JSON.parse(readFileSync(settingsPath, 'utf-8')));
      } catch {}
    }

    if (existsSync(aiConfigPath)) {
      try {
        replaceAiConfig(JSON.parse(readFileSync(aiConfigPath, 'utf-8')));
      } catch {}
    }
  });
  tx();
  return { imported: true, notes: notesData.notes?.length || 0, categories: notesData.categories?.length || 0 };
}

export function getDbPath() {
  return dbPath;
}
