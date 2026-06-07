const express = require('express');
const axios = require('axios');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');

const app = express();
const PORT = 3000;

// ---------- 信任反向代理（获取真实客户端 IP）----------
app.set('trust proxy', true);

// ---------- IP 白名单中间件 ----------
function isPrivateIP(ip) {
  // 去除 IPv6 映射前缀
  const cleanIp = ip.replace(/^::ffff:/, '');
  const parts = cleanIp.split('.').map(Number);
  if (parts.length !== 4) return false;
  // 10.x.x.x
  if (parts[0] === 10) return true;
  // 172.16-31.x.x
  if (parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31) return true;
  // 192.168.x.x
  if (parts[0] === 192 && parts[1] === 168) return true;
  // 127.x.x.x
  if (parts[0] === 127) return true;
  return false;
}

function ipCheck(req, res, next) {
  const allowedEnv = process.env.ALLOWED_IPS;
  if (!allowedEnv) return next();

  const clientIp = req.ip.replace(/^::ffff:/, '');
  const patterns = allowedEnv.split(',').map(s => s.trim()).filter(Boolean);

  const matched = patterns.some(pattern => {
    if (pattern.toLowerCase() === 'local') {
      const directIp = req.connection.remoteAddress.replace(/^::ffff:/, '');
      return isPrivateIP(clientIp) || isPrivateIP(directIp);
    }
    // 将通配符 * 转换为正则
    const regexStr = '^' + pattern
      .replace(/\./g, '\\.')
      .replace(/\*/g, '[0-9]+')
      .replace(/\?/g, '[0-9]') + '$';
    try {
      return new RegExp(regexStr).test(clientIp);
    } catch { return false; }
  });

  if (!matched) {
    console.log(`[IP Block] ${clientIp} - not in ALLOWED_IPS`);
    return res.status(403).send('Forbidden');
  }
  next();
}

app.use(ipCheck);

// ---------- JSON 解析（用于代理写请求）----------
app.use(express.json());

// ---------- API 代理 ----------
// 前端 API 端点设为 /v0 时，所有请求经此转发到 api.bgm.tv
app.all('/v0/*', async (req, res) => {
  const token = req.headers.authorization;
  if (!token) return res.status(401).json({ error: 'No token' });

  // 去掉 /v0 前缀，拼出完整目标 URL
  const bgmPath = req.path.replace('/v0', '');
  const url = `https://api.bgm.tv/v0${bgmPath}`;

  try {
    const response = await axios({
      method: req.method,
      url,
      headers: {
        'Authorization': token,
        'Content-Type': 'application/json',
        'User-Agent': 'BGM-DotGrid/1.9'
      },
      params: req.query,
      data: req.body,
      responseType: 'json',
      timeout: 15000
    });
    res.json(response.data);
  } catch (error) {
    const status = error.response?.status || 500;
    const data = error.response?.data || { error: 'Proxy error' };
    res.status(status).json(data);
  }
});

// ---------- 图片磁盘缓存配置 ----------
const IMAGE_CACHE_DIR = path.join(__dirname, 'image_cache');
if (!fs.existsSync(IMAGE_CACHE_DIR)) fs.mkdirSync(IMAGE_CACHE_DIR, { recursive: true });
const IMAGE_CACHE_TTL_MS = 60 * 60 * 1000; // 1 小时

function getImageCacheFileName(url) {
  const hash = crypto.createHash('md5').update(url).digest('hex');
  const ext = path.extname(url).split('?')[0] || '.jpg';
  return hash + ext;
}

function isImageCacheValid(filePath) {
  try {
    const stats = fs.statSync(filePath);
    return (Date.now() - stats.mtimeMs) < IMAGE_CACHE_TTL_MS;
  } catch {
    return false;
  }
}

function clearImageCache() {
  const files = fs.readdirSync(IMAGE_CACHE_DIR);
  for (const file of files) {
    const fp = path.join(IMAGE_CACHE_DIR, file);
    try { fs.unlinkSync(fp); } catch { /* ignore */ }
  }
}

// ---------- 图片代理（磁盘缓存，TTL 1 小时）----------
app.get('/img/*', async (req, res) => {
  let imagePath = req.params[0] || req.url.substring(5);
  if (!imagePath) return res.status(404).send('Not found');

  const bgmImgDomain = process.env.BGM_IMG_DOMAIN || 'lain.bgm.tv';
  const imageUrl = `https://${bgmImgDomain}/${imagePath}`;
  const cacheFile = path.join(IMAGE_CACHE_DIR, getImageCacheFileName(imageUrl));

  // 命中缓存且未过期
  if (fs.existsSync(cacheFile) && isImageCacheValid(cacheFile)) {
    const ext = path.extname(cacheFile);
    const contentType = ext === '.png' ? 'image/png' : 'image/jpeg';
    res.set('Content-Type', contentType);
    res.set('Cache-Control', 'public, max-age=3600');
    return fs.createReadStream(cacheFile).pipe(res);
  }

  try {
    const response = await axios({
      method: 'get',
      url: imageUrl,
      responseType: 'stream',
      headers: {
        'Referer': '',
        'User-Agent': 'BGM-DotGrid/1.9'
      },
      timeout: 15000
    });

    // 写入缓存（不阻塞响应）
    const writeStream = fs.createWriteStream(cacheFile);
    response.data.pipe(writeStream);

    res.set('Content-Type', response.headers['content-type']);
    res.set('Cache-Control', 'public, max-age=3600');
    response.data.pipe(res);

    writeStream.on('finish', () => {
      console.log(`[Image Cached] ${imageUrl}`);
    });
  } catch (error) {
    console.error(`[Image Error] ${imageUrl}: ${error.message}`);
    // 缓存未过期则 fallback
    if (fs.existsSync(cacheFile)) {
      res.set('Content-Type', 'image/jpeg');
      return fs.createReadStream(cacheFile).pipe(res);
    }
    // 返回占位图
    res.status(502).send('Image not available');
  }
});

// ---------- 清除图片缓存接口 ----------
app.post('/api/clear-image-cache', (req, res) => {
  clearImageCache();
  res.json({ success: true, message: 'Image cache cleared' });
});

// ---------- 健康检查 ----------
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', uptime: process.uptime() });
});

// ========== 注入环境变量到 index.html ==========
app.get('/', (req, res) => {
  const htmlPath = path.join(__dirname, 'public', 'index.html');
  if (!fs.existsSync(htmlPath)) {
    return res.status(500).send('index.html not found');
  }
  let html = fs.readFileSync(htmlPath, 'utf8');

  // 从环境变量读取配置（docker-compose），提供合理的默认值
  const envScript = `<script>window.__ENV__ = {
  BGM_SITE: ${JSON.stringify(process.env.BGM_SITE || 'https://bgm.tv')},
  API_BASE: ${JSON.stringify(process.env.API_BASE || 'https://api.bgm.tv/v0')},
  IMAGE_PROXY_PREFIX: ${JSON.stringify(process.env.IMAGE_PROXY_PREFIX || '/img/')},
  INBUILT_TOKEN: ${JSON.stringify(process.env.INBUILT_TOKEN || '')}
};</script>`;

  if (html.includes('<!-- INJECT_ENV -->')) {
    html = html.replace('<!-- INJECT_ENV -->', envScript);
  } else {
    html = html.replace('</head>', envScript + '</head>');
  }

  res.send(html);
});

// ========== 托管静态文件 ==========
app.use(express.static(path.join(__dirname, 'public')));

// ========== SPA 支持：所有未匹配路由返回 index.html ==========
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`BGM点格子 v1.9.0`);
  console.log(`  Server: http://0.0.0.0:${PORT}`);
  console.log(`  Image cache: ${IMAGE_CACHE_DIR}`);
  if (process.env.ALLOWED_IPS) {
    console.log(`  IP whitelist: ${process.env.ALLOWED_IPS}`);
  }
});
