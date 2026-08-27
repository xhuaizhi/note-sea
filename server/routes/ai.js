import { Router } from 'express';
import { randomUUID } from 'crypto';
import { authMiddleware } from './auth.js';
import { db, getAiConfig, setAiState, getAiState } from '../db.js';

const router = Router();
router.use(authMiddleware);

function maskKey(key) {
  if (!key || key.length < 8) return '***';
  return key.slice(0, 4) + '***' + key.slice(-4);
}

// SSRF 防护: 限制 AI baseUrl 仅 http(s) 且非内网/元数据地址。
// 公网部署下, 若 token 泄露, 防止把服务器当跳板探测内网/云元数据。
function validateBaseUrl(raw) {
  let u;
  try {
    u = new URL(raw);
  } catch {
    return 'baseUrl 格式无效';
  }
  if (u.protocol !== 'http:' && u.protocol !== 'https:') {
    return 'baseUrl 仅支持 http/https';
  }
  const host = u.hostname.toLowerCase();
  // 禁止 localhost / 内网段 / 云元数据地址
  const blocked = [
    /^localhost$/,
    /^127\./,
    /^0\.0\.0\.0$/,
    /^10\./,
    /^192\.168\./,
    /^172\.(1[6-9]|2[0-9]|3[0-1])\./,
    /^169\.254\./,        // 链路本地 + 云元数据 169.254.169.254
    /^::1$/,
    /^fe80:/i,
    /^fc00:/i, /^fd00:/i  // IPv6 唯一本地
  ];
  if (blocked.some(re => re.test(host))) {
    return 'baseUrl 不允许指向本地或内网地址';
  }
  return null;
}

// GET config (keys masked)
router.get('/config', (req, res) => {
  const config = getAiConfig();
  const safe = {
    ...config,
    systemPrompt: getAiState('systemPrompt', '') || '',
    providers: config.providers.map(p => ({ ...p, apiKey: maskKey(p.apiKey) }))
  };
  res.json(safe);
});

// PUT system prompt (自定义指令, 注入到每次对话的 system 消息)
router.put('/system-prompt', (req, res) => {
  const prompt = typeof req.body.prompt === 'string' ? req.body.prompt.trim() : '';
  if (prompt.length > 2000) {
    return res.status(400).json({ error: '自定义指令过长 (最多 2000 字)' });
  }
  setAiState('systemPrompt', prompt || null);
  res.json({ systemPrompt: prompt });
});

// POST add provider
router.post('/config/providers', (req, res) => {
  const { name, type, baseUrl, apiKey, models } = req.body;
  if (!name || !type || !baseUrl || !apiKey) {
    return res.status(400).json({ error: '缺少必填字段' });
  }
  const urlErr = validateBaseUrl(baseUrl);
  if (urlErr) return res.status(400).json({ error: urlErr });
  const config = getAiConfig();
  const provider = {
    id: 'prov_' + randomUUID().slice(0, 8),
    name,
    type,
    baseUrl: baseUrl.replace(/\/+$/, ''),
    apiKey,
    models: Array.isArray(models) ? models : (models || '').split(',').map(s => s.trim()).filter(Boolean)
  };
  db.prepare(`
    INSERT INTO ai_providers (id, name, type, base_url, api_key, models_json)
    VALUES (@id, @name, @type, @baseUrl, @apiKey, @modelsJson)
  `).run({ ...provider, modelsJson: JSON.stringify(provider.models) });
  if (!config.activeProviderId && provider.models.length > 0) {
    setAiState('activeProviderId', provider.id);
    setAiState('activeModel', provider.models[0]);
  }
  res.json({ ...provider, apiKey: maskKey(provider.apiKey) });
});

// PUT update provider
router.put('/config/providers/:id', (req, res) => {
  const config = getAiConfig();
  const idx = config.providers.findIndex(p => p.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: '未找到' });
  const { name, type, baseUrl, apiKey, models } = req.body;
  if (baseUrl) {
    const urlErr = validateBaseUrl(baseUrl);
    if (urlErr) return res.status(400).json({ error: urlErr });
  }
  if (name) config.providers[idx].name = name;
  if (type) config.providers[idx].type = type;
  if (baseUrl) config.providers[idx].baseUrl = baseUrl.replace(/\/+$/, '');
  if (apiKey) config.providers[idx].apiKey = apiKey;
  if (models !== undefined) {
    config.providers[idx].models = Array.isArray(models) ? models : (models || '').split(',').map(s => s.trim()).filter(Boolean);
  }
  const provider = config.providers[idx];
  db.prepare(`
    UPDATE ai_providers
    SET name = @name, type = @type, base_url = @baseUrl, api_key = @apiKey, models_json = @modelsJson
    WHERE id = @id
  `).run({ ...provider, modelsJson: JSON.stringify(provider.models || []) });
  res.json({ ...config.providers[idx], apiKey: maskKey(config.providers[idx].apiKey) });
});

// DELETE provider
router.delete('/config/providers/:id', (req, res) => {
  const config = getAiConfig();
  db.prepare('DELETE FROM ai_providers WHERE id = ?').run(req.params.id);
  if (config.activeProviderId === req.params.id) {
    const next = db.prepare('SELECT * FROM ai_providers ORDER BY rowid ASC LIMIT 1').get();
    setAiState('activeProviderId', next?.id || null);
    const models = next ? JSON.parse(next.models_json || '[]') : [];
    setAiState('activeModel', models[0] || null);
  }
  res.json({ ok: true });
});

// PUT set active provider + model
router.put('/config/active', (req, res) => {
  const { providerId, model } = req.body;
  const config = getAiConfig();
  const provider = config.providers.find(p => p.id === providerId);
  if (!provider) return res.status(404).json({ error: '未找到提供商' });
  const activeModel = model || provider.models[0];
  setAiState('activeProviderId', providerId);
  setAiState('activeModel', activeModel);
  res.json({ activeProviderId: providerId, activeModel });
});

// POST /chat — streaming proxy
router.post('/chat', async (req, res) => {
  const { messages, providerId, model } = req.body;
  if (!messages || !messages.length) {
    return res.status(400).json({ error: '消息不能为空' });
  }

  const config = getAiConfig();
  const pid = providerId || config.activeProviderId;
  const provider = config.providers.find(p => p.id === pid);
  if (!provider) {
    return res.status(400).json({ error: '未配置 AI 提供商' });
  }
  const activeModel = model || config.activeModel || provider.models[0];

  // 自定义指令作为最前面的 system 消息注入 (anthropic 路径会再汇总 system 字段)
  const systemPrompt = getAiState('systemPrompt', '') || '';
  const chatMessages = systemPrompt
    ? [{ role: 'system', content: systemPrompt }, ...messages]
    : messages;

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();

  try {
    let upstream;
    if (provider.type === 'anthropic') {
      upstream = await fetchAnthropic(provider, activeModel, chatMessages);
    } else {
      upstream = await fetchOpenAI(provider, activeModel, chatMessages);
    }

    if (!upstream.ok) {
      const errText = await upstream.text();
      res.write(`data: ${JSON.stringify({ error: errText, done: true })}\n\n`);
      return res.end();
    }

    const reader = upstream.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        if (!line.startsWith('data: ')) continue;
        const data = line.slice(6).trim();
        if (data === '[DONE]') {
          res.write(`data: ${JSON.stringify({ content: '', done: true })}\n\n`);
          continue;
        }
        try {
          const parsed = JSON.parse(data);
          const content = provider.type === 'anthropic'
            ? parseAnthropicChunk(parsed)
            : parseOpenAIChunk(parsed);
          if (content !== null) {
            res.write(`data: ${JSON.stringify({ content, done: false })}\n\n`);
          }
        } catch {}
      }
    }

    res.write(`data: ${JSON.stringify({ content: '', done: true })}\n\n`);
    res.end();
  } catch (err) {
    res.write(`data: ${JSON.stringify({ error: err.message, done: true })}\n\n`);
    res.end();
  }
});

async function fetchOpenAI(provider, model, messages) {
  const url = `${provider.baseUrl}/chat/completions`;
  return fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${provider.apiKey}`
    },
    body: JSON.stringify({ model, messages, stream: true })
  });
}

async function fetchAnthropic(provider, model, messages) {
  const url = `${provider.baseUrl}/v1/messages`;
  let system = '';
  const filtered = [];
  for (const msg of messages) {
    if (msg.role === 'system') {
      system += (system ? '\n' : '') + msg.content;
    } else {
      filtered.push({ role: msg.role, content: msg.content });
    }
  }
  const body = { model, messages: filtered, stream: true, max_tokens: 4096 };
  if (system) body.system = system;

  return fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': provider.apiKey,
      'anthropic-version': '2023-06-01'
    },
    body: JSON.stringify(body)
  });
}

function parseOpenAIChunk(parsed) {
  const delta = parsed.choices?.[0]?.delta;
  if (!delta) return null;
  return delta.content || null;
}

function parseAnthropicChunk(parsed) {
  if (parsed.type === 'content_block_delta') {
    return parsed.delta?.text || null;
  }
  return null;
}

export default router;
