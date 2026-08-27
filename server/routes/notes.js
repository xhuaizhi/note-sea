import { Router } from 'express';
import { existsSync, mkdirSync, renameSync, unlinkSync, readdirSync, readFileSync, statSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { randomUUID } from 'crypto';
import multer from 'multer';
import mammoth from 'mammoth';
import JSZip from 'jszip';
import { authMiddleware } from './auth.js';
import { db, getSettingsObject, mapCategory, mapNote, saveSettingsObject } from '../db.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const uploadsDir = join(__dirname, '..', 'data', 'uploads');

if (!existsSync(uploadsDir)) mkdirSync(uploadsDir, { recursive: true });

// mime -> 扩展名白名单 (移除 svg/html: 可内嵌脚本导致上传型 XSS)
const MIME_EXT = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/gif': 'gif',
  'image/webp': 'webp',
  'application/pdf': 'pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'docx'
};
const EXT_MIME = {
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  gif: 'image/gif',
  webp: 'image/webp',
  pdf: 'application/pdf',
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
};

const DOCX_MIME = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
function allowedUpload(file) {
  if (MIME_EXT[file.mimetype]) return { mime: file.mimetype, ext: MIME_EXT[file.mimetype] };
  const ext = String(file.originalname || '').split('.').pop().toLowerCase();
  if (EXT_MIME[ext]) return { mime: EXT_MIME[ext], ext: ext === 'jpeg' ? 'jpg' : ext };
  return null;
}

const upload = multer({
  dest: uploadsDir,
  limits: { fileSize: 50 * 1024 * 1024 },
  fileFilter(req, file, cb) {
    if (allowedUpload(file)) cb(null, true);
    else cb(new Error('仅支持 jpg/png/gif/webp/pdf/docx 文件'));
  }
});
const router = Router();

// Settings GET 不需要鉴权（登录页也要读取背景图）
router.get('/settings', (req, res) => {
  res.json(getSettingsObject());
});

router.use(authMiddleware);

// --- Categories ---
router.get('/categories', (req, res) => {
  const rows = db.prepare('SELECT * FROM categories ORDER BY sort_order ASC, rowid ASC').all();
  res.json(rows.map(mapCategory));
});

router.post('/categories', (req, res) => {
  const count = db.prepare('SELECT COUNT(*) AS count FROM categories').get().count;
  const category = {
    id: 'cat_' + randomUUID().slice(0, 8),
    name: req.body.name,
    icon: req.body.icon || '📁',
    order: count,
    parentId: req.body.parentId || null
  };
  db.prepare(`
    INSERT INTO categories (id, name, icon, sort_order, parent_id)
    VALUES (@id, @name, @icon, @order, @parentId)
  `).run(category);
  res.json(category);
});

router.put('/categories/:id', (req, res) => {
  const current = db.prepare('SELECT * FROM categories WHERE id = ?').get(req.params.id);
  if (!current) return res.status(404).json({ error: '分类不存在' });

  const next = {
    id: req.params.id,
    name: req.body.name !== undefined ? req.body.name : current.name,
    icon: req.body.icon !== undefined ? req.body.icon : current.icon,
    sortOrder: req.body.order !== undefined ? req.body.order : current.sort_order
  };
  db.prepare('UPDATE categories SET name = @name, icon = @icon, sort_order = @sortOrder WHERE id = @id').run(next);
  res.json(mapCategory(db.prepare('SELECT * FROM categories WHERE id = ?').get(req.params.id)));
});

router.delete('/categories/:id', (req, res) => {
  const now = new Date().toISOString();
  const tx = db.transaction(() => {
    db.prepare('DELETE FROM categories WHERE id = ?').run(req.params.id);
    db.prepare('UPDATE notes SET deleted_at = ?, updated_at = ? WHERE category_id = ? AND deleted_at IS NULL')
      .run(now, now, req.params.id);
  });
  tx();
  res.json({ ok: true });
});

// --- Notes ---
router.get('/notes', (req, res) => {
  const rows = db.prepare(`
    SELECT id, title, category_id, created_at, updated_at, sort_order, pinned, deleted_at, tags_json, ai_summary, type
    FROM notes
    WHERE deleted_at IS NULL
    ORDER BY pinned DESC, datetime(updated_at) DESC
  `).all();
  res.json(rows.map(row => mapNote(row, false)));
});

router.get('/notes/:id', (req, res) => {
  const row = db.prepare('SELECT * FROM notes WHERE id = ? AND deleted_at IS NULL').get(req.params.id);
  if (!row) return res.status(404).json({ error: '笔记不存在' });
  res.json(mapNote(row));
});

router.post('/notes', (req, res) => {
  const now = new Date().toISOString();
  const order = db.prepare('SELECT COUNT(*) AS count FROM notes WHERE category_id IS ?').get(req.body.categoryId || null).count;
  // type 白名单: 'html' 原样嵌入(只读) | 'pdf' 原版查看 | 'image' 图片 | 'txt' 文本 | 其余一律 'rich'
  const allowedTypes = ['html', 'pdf', 'image', 'txt'];
  const type = allowedTypes.includes(req.body.type) ? req.body.type : 'rich';
  const note = {
    id: 'note_' + randomUUID().slice(0, 8),
    title: req.body.title || '无标题',
    content: req.body.content || '',
    categoryId: req.body.categoryId || null,
    createdAt: now,
    updatedAt: now,
    order,
    pinned: false,
    type,
    tags: [],
    aiSummary: undefined
  };
  db.prepare(`
    INSERT INTO notes (
      id, title, content, category_id, created_at, updated_at, sort_order,
      pinned, deleted_at, tags_json, ai_summary, type
    )
    VALUES (
      @id, @title, @content, @categoryId, @createdAt, @updatedAt, @order,
      0, NULL, '[]', NULL, @type
    )
  `).run(note);
  res.json(note);
});

router.put('/notes/:id', (req, res) => {
  const current = db.prepare('SELECT * FROM notes WHERE id = ?').get(req.params.id);
  if (!current) return res.status(404).json({ error: '笔记不存在' });

  const next = {
    id: req.params.id,
    title: req.body.title !== undefined ? req.body.title : current.title,
    content: req.body.content !== undefined ? req.body.content : current.content,
    categoryId: req.body.categoryId !== undefined ? req.body.categoryId : current.category_id,
    sortOrder: req.body.order !== undefined ? req.body.order : current.sort_order,
    pinned: req.body.pinned !== undefined ? (req.body.pinned ? 1 : 0) : current.pinned,
    tagsJson: req.body.tags !== undefined ? JSON.stringify(req.body.tags || []) : current.tags_json,
    aiSummary: req.body.aiSummary !== undefined ? req.body.aiSummary : current.ai_summary,
    updatedAt: new Date().toISOString()
  };

  db.prepare(`
    UPDATE notes
    SET title = @title,
        content = @content,
        category_id = @categoryId,
        sort_order = @sortOrder,
        pinned = @pinned,
        tags_json = @tagsJson,
        ai_summary = @aiSummary,
        updated_at = @updatedAt
    WHERE id = @id
  `).run(next);

  res.json(mapNote(db.prepare('SELECT * FROM notes WHERE id = ?').get(req.params.id)));
});

router.delete('/notes/:id', (req, res) => {
  const now = new Date().toISOString();
  const result = db.prepare('UPDATE notes SET deleted_at = ?, updated_at = ? WHERE id = ?').run(now, now, req.params.id);
  if (!result.changes) return res.status(404).json({ error: '笔记不存在' });
  res.json({ ok: true });
});

// --- Trash ---
router.get('/trash', (req, res) => {
  const rows = db.prepare(`
    SELECT id, title, category_id, created_at, updated_at, sort_order, pinned, deleted_at, tags_json, ai_summary, type
    FROM notes
    WHERE deleted_at IS NOT NULL
    ORDER BY datetime(deleted_at) DESC
  `).all();
  res.json(rows.map(row => mapNote(row, false)));
});

router.post('/trash/:id/restore', (req, res) => {
  const now = new Date().toISOString();
  const result = db.prepare('UPDATE notes SET deleted_at = NULL, updated_at = ? WHERE id = ? AND deleted_at IS NOT NULL')
    .run(now, req.params.id);
  if (!result.changes) return res.status(404).json({ error: '笔记不存在' });
  res.json({ ok: true });
});

router.delete('/trash/:id', (req, res) => {
  const result = db.prepare('DELETE FROM notes WHERE id = ?').run(req.params.id);
  if (!result.changes) return res.status(404).json({ error: '笔记不存在' });
  res.json({ ok: true });
});

router.delete('/trash', (req, res) => {
  db.prepare('DELETE FROM notes WHERE deleted_at IS NOT NULL').run();
  res.json({ ok: true });
});

// --- Tags ---
router.get('/tags', (req, res) => {
  const rows = db.prepare('SELECT tags_json FROM notes WHERE deleted_at IS NULL').all();
  const tagMap = {};
  for (const row of rows) {
    const tags = JSON.parse(row.tags_json || '[]');
    tags.forEach(t => { tagMap[t] = (tagMap[t] || 0) + 1; });
  }
  const tags = Object.entries(tagMap).map(([name, count]) => ({ name, count }));
  tags.sort((a, b) => b.count - a.count);
  res.json(tags);
});

// --- Search ---
router.get('/search', (req, res) => {
  const q = (req.query.q || '').toString().trim();
  if (!q) return res.json([]);
  const escaped = q.toLowerCase().replace(/[%_\\]/g, '\\$&');
  const like = `%${escaped}%`;
  const rows = db.prepare(`
    SELECT *
    FROM notes
    WHERE deleted_at IS NULL
      AND (lower(title) LIKE ? ESCAPE '\\' OR lower(content) LIKE ? ESCAPE '\\')
    ORDER BY pinned DESC, datetime(updated_at) DESC
    LIMIT 100
  `).all(like, like);

  const results = rows.map(row => {
    const note = mapNote(row, false);
    const plain = (row.content || '').replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();
    const idx = plain.toLowerCase().indexOf(q.toLowerCase());
    if (idx >= 0) {
      const start = Math.max(0, idx - 30);
      const end = Math.min(plain.length, idx + q.length + 60);
      note.snippet = (start > 0 ? '...' : '') + plain.slice(start, end) + (end < plain.length ? '...' : '');
    } else {
      note.snippet = plain.slice(0, 90) + (plain.length > 90 ? '...' : '');
    }
    return note;
  });
  res.json(results);
});

// --- Import DOCX ---
router.post('/import-docx', upload.single('file'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: '没有文件' });
  if (!allowedUpload(req.file) || allowedUpload(req.file).mime !== DOCX_MIME) {
    try { unlinkSync(req.file.path); } catch {}
    return res.status(400).json({ error: '仅支持 DOCX 文件' });
  }
  try {
    const result = await mammoth.convertToHtml({ path: req.file.path });
    const title = (req.file.originalname || 'Word 文档').replace(/\.docx$/i, '') || 'Word 文档';
    res.json({ title, html: result.value || '<p></p>', messages: result.messages || [] });
  } catch (err) {
    console.error('[DOCX Import]', err.message || err);
    res.status(500).json({ error: 'DOCX 解析失败' });
  } finally {
    try { unlinkSync(req.file.path); } catch {}
  }
});

// --- Upload ---
router.post('/upload', upload.single('file'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: '没有文件' });
  // 扩展名由 mime 白名单推导, 不信任客户端 originalname (防路径遍历/任意写)
  const ext = allowedUpload(req.file)?.ext;
  if (!ext) return res.status(400).json({ error: '不支持的文件类型' });
  const filename = req.file.filename + '.' + ext;
  renameSync(req.file.path, join(uploadsDir, filename));
  res.json({ url: '/uploads/' + filename });
});

// --- Settings (PUT requires auth, already behind authMiddleware) ---
router.put('/settings', (req, res) => {
  const current = getSettingsObject();
  const { loginBg, homeBg, uiOpacity } = req.body;
  if (loginBg !== undefined) current.loginBg = loginBg || null;
  if (homeBg !== undefined) current.homeBg = homeBg || null;
  if (uiOpacity !== undefined) current.uiOpacity = Math.min(0.95, Math.max(0.35, Number(uiOpacity) || 0.75));
  saveSettingsObject(current);
  res.json(current);
});

// --- Export backup ---
// 全量备份打包为 zip 下载: data.json (分类+笔记含回收站+外观设置) + uploads/ 全部上传文件。
// 安全: 不导出 config.json (密码哈希/jwtSecret) 与 ai-config (API Key) —— 备份文件不含任何密钥。
router.get('/export', async (req, res) => {
  try {
    const data = {
      exportedAt: new Date().toISOString(),
      categories: db.prepare('SELECT * FROM categories ORDER BY sort_order ASC').all().map(mapCategory),
      notes: db.prepare('SELECT * FROM notes ORDER BY created_at ASC').all().map(mapNote),
      settings: getSettingsObject()
    };
    const zip = new JSZip();
    zip.file('data.json', JSON.stringify(data, null, 2));
    for (const name of readdirSync(uploadsDir)) {
      const p = join(uploadsDir, name);
      try {
        if (statSync(p).isFile()) zip.file('uploads/' + name, readFileSync(p));
      } catch { /* 单个文件读取失败不阻断整体导出 */ }
    }
    const buf = await zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE' });
    const stamp = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', `attachment; filename="note-sea-backup-${stamp}.zip"`);
    res.send(buf);
  } catch (err) {
    console.error('[Export]', err.message || err);
    res.status(500).json({ error: '导出失败' });
  }
});

// --- Import backup (合并恢复) ---
// 上传备份 zip 恢复数据。策略: 合并 —— 分类/笔记按 id 已存在则跳过, 上传文件同名则跳过,
// 不覆盖、不删除任何现有数据 (安全且可重放)。外观设置不恢复 (避免覆盖当前偏好)。
const importUpload = multer({
  dest: uploadsDir,
  limits: { fileSize: 300 * 1024 * 1024 },
  fileFilter(req, file, cb) {
    // 浏览器对 zip 的 mimetype 不统一 (application/zip | x-zip-compressed | octet-stream),
    // 以扩展名为准再由 JSZip 实际解析校验
    const ext = String(file.originalname || '').split('.').pop().toLowerCase();
    if (ext === 'zip') cb(null, true);
    else cb(new Error('仅支持备份 zip 文件'));
  }
});

const IMPORT_TYPES = ['rich', 'html', 'pdf', 'image', 'txt'];
// zip 内上传文件名白名单: uuid/哈希风格, 不允许路径分隔符 (防 zip slip 路径穿越)
const UPLOAD_NAME_RE = /^[A-Za-z0-9][A-Za-z0-9._-]*$/;

router.post('/import-backup', importUpload.single('file'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: '没有文件' });
  try {
    const zip = await JSZip.loadAsync(readFileSync(req.file.path));
    const dataFile = zip.file('data.json');
    if (!dataFile) {
      return res.status(400).json({ error: '备份格式无效: 缺少 data.json (需为本系统导出的备份)' });
    }
    const data = JSON.parse(await dataFile.async('string'));
    if (!Array.isArray(data.notes) || !Array.isArray(data.categories)) {
      return res.status(400).json({ error: '备份格式无效: data.json 结构不正确' });
    }

    // 1. 恢复上传文件 (先写文件: 幂等跳过, db 失败时残留文件无害)
    let uploadsImported = 0;
    for (const entry of Object.values(zip.files)) {
      if (entry.dir) continue;
      const m = entry.name.match(/^uploads\/([^/]+)$/);
      if (!m) continue;                       // 只认 uploads/ 平铺文件, 忽略其它条目
      const name = m[1];
      if (!UPLOAD_NAME_RE.test(name)) continue; // 防路径穿越/怪名
      const dest = join(uploadsDir, name);
      if (existsSync(dest)) continue;          // 同名已存在则跳过, 不覆盖
      writeFileSync(dest, await entry.async('nodebuffer'));
      uploadsImported++;
    }

    // 2. 合并分类与笔记 (事务: 全部成功或全部回滚)
    const existingCat = new Set(db.prepare('SELECT id FROM categories').all().map(r => r.id));
    const existingNote = new Set(db.prepare('SELECT id FROM notes').all().map(r => r.id));
    const catsToInsert = data.categories.filter(c => c && c.id && !existingCat.has(c.id));
    const notesToInsert = data.notes.filter(n => n && n.id && !existingNote.has(n.id));

    const insertCat = db.prepare(`
      INSERT INTO categories (id, name, icon, sort_order, parent_id)
      VALUES (@id, @name, @icon, @order, @parentId)
    `);
    const insertNote = db.prepare(`
      INSERT INTO notes (
        id, title, content, category_id, created_at, updated_at, sort_order,
        pinned, deleted_at, tags_json, ai_summary, type
      ) VALUES (
        @id, @title, @content, @categoryId, @createdAt, @updatedAt, @order,
        @pinned, @deletedAt, @tagsJson, @aiSummary, @type
      )
    `);

    db.transaction(() => {
      for (const c of catsToInsert) {
        insertCat.run({
          id: String(c.id), name: String(c.name || '未命名').slice(0, 100),
          icon: c.icon ? String(c.icon).slice(0, 16) : null,
          order: Number(c.order) || 0,
          parentId: c.parentId || null
        });
      }
      for (const n of notesToInsert) {
        insertNote.run({
          id: String(n.id), title: String(n.title || '无标题').slice(0, 500),
          content: String(n.content ?? ''),
          categoryId: n.categoryId || null,
          createdAt: n.createdAt || new Date().toISOString(),
          updatedAt: n.updatedAt || n.createdAt || new Date().toISOString(),
          order: Number(n.order) || 0,
          pinned: n.pinned ? 1 : 0,
          deletedAt: n.deletedAt || null,
          tagsJson: JSON.stringify(Array.isArray(n.tags) ? n.tags.slice(0, 50) : []),
          aiSummary: n.aiSummary ? String(n.aiSummary) : null,
          type: IMPORT_TYPES.includes(n.type) ? n.type : 'rich'
        });
      }
    })();

    res.json({
      categoriesImported: catsToInsert.length,
      categoriesSkipped: data.categories.length - catsToInsert.length,
      notesImported: notesToInsert.length,
      notesSkipped: data.notes.length - notesToInsert.length,
      uploadsImported
    });
  } catch (err) {
    console.error('[Import]', err.message || err);
    res.status(500).json({ error: err.message?.includes('JSON') ? '备份格式无效' : '导入失败' });
  } finally {
    try { unlinkSync(req.file.path); } catch {} // 清掉 multer 临时文件
  }
});

export default router;
