import express from 'express';
import cors from 'cors';
import compression from 'compression';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import authRoutes from './routes/auth.js';
import notesRoutes from './routes/notes.js';
import aiRoutes from './routes/ai.js';
import { getDbPath, importJsonDataIfEmpty } from './db.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;
const importResult = importJsonDataIfEmpty();
if (importResult.imported) {
  console.log(`[DB] Imported ${importResult.notes} notes and ${importResult.categories} categories into ${getDbPath()}`);
}

const allowedOrigins = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(',')
  : null;

app.use(compression());

// 基础安全响应头
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  res.setHeader('Referrer-Policy', 'same-origin');
  next();
});
// CORS: 仅在显式配置 ALLOWED_ORIGINS 时放行白名单跨域;
// 未配置时不启用 CORS —— 前端与 API 同源 (server 托管 dist), 同源无需 CORS,
// 跨域请求由浏览器同源策略拦截 (公网下不再默认全开)。
if (allowedOrigins) {
  app.use(cors({
    origin(origin, cb) {
      if (!origin || allowedOrigins.includes(origin)) cb(null, true);
      else cb(new Error('CORS blocked'));
    },
    credentials: true
  }));
}

app.use(express.json({ limit: '10mb' }));

app.use('/api/auth', authRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api', notesRoutes);

app.use('/resources', express.static(join(__dirname, '..', '_resources')));
app.use('/uploads', express.static(join(__dirname, 'data', 'uploads'), {
  setHeaders(res, filePath) {
    if (/\.pdf$/i.test(filePath)) {
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Security-Policy', "default-src 'self' blob: data:; script-src 'self' 'unsafe-inline' blob:; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; frame-ancestors 'self'");
    } else {
      // 防止上传文件被浏览器内联执行 (兜底 svg/html 类残留风险)
      res.setHeader('Content-Security-Policy', "default-src 'none'; img-src 'self'; style-src 'unsafe-inline'");
    }
  }
}));

const clientDist = join(__dirname, '..', 'client', 'dist');
// 静态资源带内容哈希可长缓存; 但 index.html 必须 no-cache ——
// 否则浏览器缓存旧 html 里的旧 chunk 名, 发版后页面停在旧版 (本次排查的实际问题)
app.use(express.static(clientDist, {
  setHeaders(res, filePath) {
    if (filePath.endsWith('.html')) {
      res.setHeader('Cache-Control', 'no-cache');
    }
  }
}));
app.get('*', (req, res) => {
  res.setHeader('Cache-Control', 'no-cache');
  res.sendFile(join(clientDist, 'index.html'));
});

app.use((err, req, res, next) => {
  if (err.code === 'LIMIT_FILE_SIZE') {
    return res.status(413).json({ error: '文件大小超过 50MB 限制' });
  }
  if (err.type === 'entity.too.large' || err.status === 413) {
    return res.status(413).json({ error: '请求体过大' });
  }
  if (err.message && err.message.includes('仅支持')) {
    return res.status(400).json({ error: err.message });
  }
  console.error('[Error]', err.message || err);
  res.status(500).json({ error: '服务器内部错误' });
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
