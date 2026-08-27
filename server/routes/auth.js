import { Router } from 'express';
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { createHash, randomBytes } from 'crypto';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';

const __dirname = dirname(fileURLToPath(import.meta.url));
const configPath = join(__dirname, '..', 'data', 'config.json');
const BCRYPT_ROUNDS = 10;

function getOrCreateSecret() {
  const config = existsSync(configPath) ? JSON.parse(readFileSync(configPath, 'utf-8')) : {};
  if (config.jwtSecret) return config.jwtSecret;
  // 全新克隆时 server/data/ 尚不存在 (gitignore), 写入前先创建
  mkdirSync(dirname(configPath), { recursive: true });
  const secret = 'kb-' + randomBytes(32).toString('hex');
  writeFileSync(configPath, JSON.stringify({ ...config, jwtSecret: secret }, null, 2));
  return secret;
}

let JWT_SECRET = getOrCreateSecret();
const router = Router();

// 登录限流: 防公网密码爆破 (内存计数, 按 IP)
const loginAttempts = new Map(); // ip -> { count, lockUntil }
const MAX_ATTEMPTS = 8;
const LOCK_MS = 15 * 60 * 1000;

function getClientIp(req) {
  const fwd = (req.headers['x-forwarded-for'] || '').toString().split(',')[0].trim();
  return fwd || req.ip || req.socket?.remoteAddress || 'unknown';
}

function lockedSeconds(ip) {
  const rec = loginAttempts.get(ip);
  if (rec && rec.lockUntil > Date.now()) {
    return Math.ceil((rec.lockUntil - Date.now()) / 1000);
  }
  return 0;
}

function recordFailure(ip) {
  const rec = loginAttempts.get(ip) || { count: 0, lockUntil: 0 };
  rec.count += 1;
  if (rec.count >= MAX_ATTEMPTS) {
    rec.lockUntil = Date.now() + LOCK_MS;
    rec.count = 0;
  }
  loginAttempts.set(ip, rec);
}

function clearFailures(ip) {
  loginAttempts.delete(ip);
}

function rotateSecret(config) {
  const secret = 'kb-' + randomBytes(32).toString('hex');
  JWT_SECRET = secret;
  saveConfig({ ...config, jwtSecret: secret });
}

function getConfig() {
  if (!existsSync(configPath)) return null;
  return JSON.parse(readFileSync(configPath, 'utf-8'));
}

function saveConfig(config) {
  writeFileSync(configPath, JSON.stringify(config, null, 2));
}

function isLegacySha256(hash) {
  return /^[a-f0-9]{64}$/.test(hash);
}

function legacyHash(password) {
  return createHash('sha256').update(password).digest('hex');
}

router.get('/status', (req, res) => {
  const config = getConfig();
  res.json({ initialized: !!(config && config.passwordHash) });
});

router.post('/setup', async (req, res) => {
  const config = getConfig();
  if (config && config.passwordHash) {
    return res.status(400).json({ error: '密码已设置' });
  }
  const { password } = req.body;
  if (!password || password.length < 8) {
    return res.status(400).json({ error: '密码至少8位' });
  }
  const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);
  const existing = config || {};
  saveConfig({ ...existing, passwordHash });
  const token = jwt.sign({ role: 'owner' }, JWT_SECRET, { expiresIn: '7d' });
  res.json({ token });
});

router.post('/login', async (req, res) => {
  const ip = getClientIp(req);
  const locked = lockedSeconds(ip);
  if (locked > 0) {
    return res.status(429).json({ error: `尝试过于频繁, 请 ${Math.ceil(locked / 60)} 分钟后再试` });
  }

  const config = getConfig();
  if (!config || !config.passwordHash) {
    return res.status(400).json({ error: '请先设置密码' });
  }
  const { password } = req.body;
  if (!password) {
    recordFailure(ip);
    return res.status(401).json({ error: '密码错误' });
  }

  let valid = false;
  if (isLegacySha256(config.passwordHash)) {
    valid = legacyHash(password) === config.passwordHash;
    if (valid) {
      const newHash = await bcrypt.hash(password, BCRYPT_ROUNDS);
      saveConfig({ ...config, passwordHash: newHash });
    }
  } else {
    valid = await bcrypt.compare(password, config.passwordHash);
  }

  if (!valid) {
    recordFailure(ip);
    return res.status(401).json({ error: '密码错误' });
  }
  clearFailures(ip);
  const token = jwt.sign({ role: 'owner' }, JWT_SECRET, { expiresIn: '7d' });
  res.json({ token });
});

router.post('/change-password', async (req, res) => {
  const auth = req.headers.authorization;
  if (!auth || !auth.startsWith('Bearer ')) {
    return res.status(401).json({ error: '未登录' });
  }
  try {
    jwt.verify(auth.slice(7), JWT_SECRET);
  } catch {
    return res.status(401).json({ error: '登录已过期' });
  }
  const config = getConfig();
  const { oldPassword, newPassword } = req.body;
  if (!oldPassword) {
    return res.status(400).json({ error: '当前密码错误' });
  }

  let oldValid = false;
  if (isLegacySha256(config.passwordHash)) {
    oldValid = legacyHash(oldPassword) === config.passwordHash;
  } else {
    oldValid = await bcrypt.compare(oldPassword, config.passwordHash);
  }
  if (!oldValid) {
    return res.status(400).json({ error: '当前密码错误' });
  }
  if (!newPassword || newPassword.length < 8) {
    return res.status(400).json({ error: '新密码至少8位' });
  }
  const passwordHash = await bcrypt.hash(newPassword, BCRYPT_ROUNDS);
  saveConfig({ ...config, passwordHash });
  // 轮换 jwtSecret: 改密后所有旧 token (含其它设备) 立即失效
  rotateSecret(getConfig());
  const token = jwt.sign({ role: 'owner' }, JWT_SECRET, { expiresIn: '7d' });
  res.json({ success: true, token });
});

export function authMiddleware(req, res, next) {
  const auth = req.headers.authorization;
  if (!auth || !auth.startsWith('Bearer ')) {
    return res.status(401).json({ error: '未登录' });
  }
  try {
    jwt.verify(auth.slice(7), JWT_SECRET);
    next();
  } catch {
    res.status(401).json({ error: '登录已过期' });
  }
}

export default router;
