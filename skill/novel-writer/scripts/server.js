#!/usr/bin/env node
// AI小说创作系统 - 本地服务器（无需 npm install，Node 18+）
// 功能：提供网页、把小说保存成本地文件、代理各家 AI 接口（避免浏览器跨域，Claude 的 Key 不进浏览器）
'use strict';

const http = require('http');
const fs = require('fs');
const path = require('path');
const os = require('os');

const PORT = parseInt(process.env.PORT || '3000', 10);
const HOST = process.env.HOST || '127.0.0.1';
const APP_DIR = path.resolve(__dirname, '..', 'app');
const DATA_DIR = path.resolve(process.env.NOVEL_DATA_DIR || path.join(os.homedir(), 'novel-writer-data'));
const NOVELS_DIR = path.join(DATA_DIR, 'novels');

// 允许代理的 AI 接口域名
const PROXY_HOSTS = new Set([
    'generativelanguage.googleapis.com',
    'api.deepseek.com',
    'api.minimax.cn',
    'api.minimax.io',
    'api.minimaxi.com',
    'open.bigmodel.cn'
]);

const CLAUDE_MODELS = new Set(['claude-opus-5-5', 'claude-sonnet-5-5', 'claude-haiku-5-5']);
const FALLBACK_MODELS = new Set(['claude-opus-5-5', 'claude-sonnet-5-5']);

const MIME = {
    '.html': 'text/html; charset=utf-8',
    '.js': 'text/javascript; charset=utf-8',
    '.css': 'text/css; charset=utf-8',
    '.md': 'text/markdown; charset=utf-8',
    '.json': 'application/json; charset=utf-8',
    '.png': 'image/png',
    '.svg': 'image/svg+xml',
    '.ico': 'image/x-icon'
};

fs.mkdirSync(NOVELS_DIR, { recursive: true });

// ---------- 工具 ----------
function send(res, status, body, type) {
    const data = typeof body === 'string' || Buffer.isBuffer(body) ? body : JSON.stringify(body);
    res.writeHead(status, { 'Content-Type': type || 'application/json; charset=utf-8', 'Cache-Control': 'no-store' });
    res.end(data);
}

function readBody(req, limit = 50 * 1024 * 1024) {
    return new Promise((resolve, reject) => {
        const chunks = [];
        let size = 0;
        req.on('data', c => {
            size += c.length;
            if (size > limit) { reject(new Error('请求太大')); req.destroy(); return; }
            chunks.push(c);
        });
        req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
        req.on('error', reject);
    });
}

// 只允许安全的 id，防止路径穿越
function safeId(id) {
    if (!/^[A-Za-z0-9_\-.]{1,80}$/.test(id) || id === '.' || id === '..') throw new Error('非法的 id');
    return id;
}

function readJson(file, fallback) {
    try { return JSON.parse(fs.readFileSync(file, 'utf8')); } catch (e) { return fallback; }
}

function writeJson(file, data) {
    fs.mkdirSync(path.dirname(file), { recursive: true });
    const tmp = file + '.tmp';
    fs.writeFileSync(tmp, JSON.stringify(data, null, 2));
    fs.renameSync(tmp, file);
}

// ---------- 小说存储 ----------
// data/novels/<id>/meta.json                  小说设定与创作进度
// data/novels/<id>/chapters/<n>.json          章节（含历史版本、画布位置）
// data/novels/<id>/chapters/第<n>章.md         章节正文，可直接用编辑器或 Claude 修改，网页会读取最新的修改
function chapterMd(dir, n) { return path.join(dir, `第${n}章.md`); }

function loadChapters(id) {
    const dir = path.join(NOVELS_DIR, safeId(id), 'chapters');
    if (!fs.existsSync(dir)) return [];
    return fs.readdirSync(dir).filter(f => /^\d+\.json$/.test(f)).map(f => {
        const jf = path.join(dir, f);
        const ch = readJson(jf, null);
        if (!ch) return null;
        const mf = chapterMd(dir, ch.number);
        try {
            // 正文 .md 在网页保存后又被改过：以 .md 为准
            if (fs.existsSync(mf) && fs.statSync(mf).mtimeMs > fs.statSync(jf).mtimeMs + 500) {
                const md = fs.readFileSync(mf, 'utf8');
                if (md !== ch.content) {
                    ch.versions = (ch.versions || []).concat([{ content: ch.content, title: ch.title || '', at: ch.updatedAt, source: ch.source || 'ai' }]).slice(-5);
                    ch.content = md;
                    ch.source = 'manual';
                    ch.updatedAt = new Date().toISOString();
                    writeJson(jf, ch);
                }
            }
        } catch (e) { /* 忽略 */ }
        return ch;
    }).filter(Boolean).sort((a, b) => a.number - b.number);
}

function saveChapter(id, ch) {
    const n = parseInt(ch.number, 10);
    if (!(n > 0)) throw new Error('章节号无效');
    const dir = path.join(NOVELS_DIR, safeId(id), 'chapters');
    writeJson(path.join(dir, `${n}.json`), ch);
    fs.writeFileSync(chapterMd(dir, n), String(ch.content || ''));
    // 让 .json 比 .md 新，避免下次读取时误判为外部修改
    const now = new Date();
    fs.utimesSync(path.join(dir, `${n}.json`), now, new Date(now.getTime() + 1000));
}

// ---------- Claude（通过 Anthropic API） ----------
async function callClaude(body, userKey) {
    const apiKey = process.env.ANTHROPIC_API_KEY || userKey;
    if (!apiKey) throw Object.assign(new Error('没有 Anthropic API Key：请设置环境变量 ANTHROPIC_API_KEY，或在网页设置里填写'), { status: 400 });
    const model = CLAUDE_MODELS.has(body.model) ? body.model : 'claude-opus-5-5';
    const effort = ['low', 'medium', 'high', 'xhigh', 'max'].includes(body.effort) ? body.effort : 'medium';
    const payload = {
        model,
        max_tokens: 64000,
        stream: true,
        output_config: { effort },
        messages: [{ role: 'user', content: String(body.prompt || '') }]
    };
    if (body.system) payload.system = String(body.system);
    const headers = {
        'content-type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01'
    };
    if (FALLBACK_MODELS.has(model)) {
        // 被安全分类器拒绝时，服务端自动换模型重试
        headers['anthropic-beta'] = 'server-side-fallback-2026-07-01';
        payload.fallbacks = 'default';
    }
    const resp = await fetch('https://api.anthropic.com/v1/messages', { method: 'POST', headers, body: JSON.stringify(payload) });
    if (!resp.ok) {
        const err = await resp.json().catch(() => ({}));
        throw Object.assign(new Error((err.error && err.error.message) || `Anthropic API 错误 ${resp.status}`), { status: resp.status });
    }
    // 读取流式返回，拼出全文
    const decoder = new TextDecoder();
    let buf = '', text = '', stopReason = null, errMsg = null;
    for await (const chunk of resp.body) {
        buf += decoder.decode(chunk, { stream: true });
        let idx;
        while ((idx = buf.indexOf('\n\n')) >= 0) {
            const evt = buf.slice(0, idx);
            buf = buf.slice(idx + 2);
            const line = evt.split('\n').find(l => l.startsWith('data:'));
            if (!line) continue;
            let data;
            try { data = JSON.parse(line.slice(5).trim()); } catch (e) { continue; }
            if (data.type === 'content_block_delta' && data.delta && data.delta.type === 'text_delta') text += data.delta.text;
            else if (data.type === 'message_delta' && data.delta) stopReason = data.delta.stop_reason || stopReason;
            else if (data.type === 'error') errMsg = (data.error && data.error.message) || 'Anthropic 流式错误';
        }
    }
    if (errMsg) throw Object.assign(new Error(errMsg), { status: 502 });
    if (stopReason === 'refusal' && !text) throw Object.assign(new Error('Claude 拒绝了这次请求，请调整内容后重试'), { status: 422 });
    return { text, stop_reason: stopReason, model };
}

// ---------- 路由 ----------
async function handleApi(req, res, url) {
    const p = url.pathname;

    if (p === '/api/ping') return send(res, 200, { ok: true, dataDir: DATA_DIR, claudeKeyFromEnv: !!process.env.ANTHROPIC_API_KEY });

    if (p === '/api/novels' && req.method === 'GET') {
        const list = fs.readdirSync(NOVELS_DIR).map(id => {
            const m = readJson(path.join(NOVELS_DIR, id, 'meta.json'), null);
            return m ? Object.assign(m, { id }) : null;
        }).filter(Boolean);
        return send(res, 200, list);
    }

    let m = p.match(/^\/api\/novels\/([^/]+)$/);
    if (m) {
        const id = safeId(decodeURIComponent(m[1]));
        const dir = path.join(NOVELS_DIR, id);
        if (req.method === 'PUT') {
            const meta = JSON.parse(await readBody(req));
            delete meta.id;
            writeJson(path.join(dir, 'meta.json'), meta);
            return send(res, 200, { ok: true });
        }
        if (req.method === 'DELETE') {
            // 删除前移到回收站，避免误删
            const trash = path.join(DATA_DIR, 'trash');
            fs.mkdirSync(trash, { recursive: true });
            if (fs.existsSync(dir)) fs.renameSync(dir, path.join(trash, `${id}-${Date.now()}`));
            return send(res, 200, { ok: true });
        }
    }

    m = p.match(/^\/api\/novels\/([^/]+)\/chapters$/);
    if (m && req.method === 'GET') return send(res, 200, loadChapters(decodeURIComponent(m[1])));

    m = p.match(/^\/api\/novels\/([^/]+)\/chapters\/(\d+)$/);
    if (m && req.method === 'PUT') {
        const ch = JSON.parse(await readBody(req));
        ch.number = parseInt(m[2], 10);
        saveChapter(decodeURIComponent(m[1]), ch);
        return send(res, 200, { ok: true });
    }

    if (p === '/api/claude' && req.method === 'POST') {
        const body = JSON.parse(await readBody(req));
        return send(res, 200, await callClaude(body, req.headers['x-user-api-key']));
    }

    if (p === '/api/proxy' && req.method === 'POST') {
        const target = new URL(String(req.headers['x-target-url'] || ''));
        if (target.protocol !== 'https:' || !PROXY_HOSTS.has(target.hostname)) return send(res, 403, { error: { message: '不允许代理这个地址' } });
        const headers = { 'content-type': 'application/json' };
        for (const h of ['authorization', 'x-api-key', 'anthropic-version', 'accept']) {
            if (req.headers[h]) headers[h] = req.headers[h];
        }
        let upstream;
        try {
            upstream = await fetch(target, { method: 'POST', headers, body: await readBody(req) });
        } catch (e) {
            return send(res, 502, { error: { message: `连接 ${target.hostname} 失败：${e.message}` } });
        }
        // 流式返回边收边转发，长时间生成也不会卡住
        res.writeHead(upstream.status, { 'Content-Type': upstream.headers.get('content-type') || 'application/json', 'Cache-Control': 'no-store' });
        if (upstream.body) {
            for await (const chunk of upstream.body) res.write(chunk);
        }
        return res.end();
    }

    return send(res, 404, { error: { message: 'API端点不存在' } });
}

function serveStatic(req, res, url) {
    let rel = decodeURIComponent(url.pathname);
    if (rel === '/' || rel === '') rel = '/index.html';
    const file = path.resolve(APP_DIR, '.' + rel);
    if (!file.startsWith(APP_DIR + path.sep)) return send(res, 403, '禁止访问', 'text/plain; charset=utf-8');
    fs.readFile(file, (err, data) => {
        if (err) return send(res, 404, '页面不存在', 'text/plain; charset=utf-8');
        send(res, 200, data, MIME[path.extname(file).toLowerCase()] || 'application/octet-stream');
    });
}

const server = http.createServer(async (req, res) => {
    const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
    try {
        if (url.pathname.startsWith('/api/')) await handleApi(req, res, url);
        else serveStatic(req, res, url);
    } catch (e) {
        if (res.headersSent) return res.end();
        send(res, e.status || 500, { error: { message: e.message || String(e) } });
    }
});

server.on('error', e => {
    if (e.code === 'EADDRINUSE') {
        console.error(`端口 ${PORT} 已被占用。可能已经在运行：打开 http://localhost:${PORT} ；或用 PORT=3001 换一个端口。`);
    } else {
        console.error(e);
    }
    process.exit(1);
});

server.listen(PORT, HOST, () => {
    console.log(`AI小说创作系统已启动： http://localhost:${PORT}`);
    console.log(`小说保存位置： ${DATA_DIR}`);
    console.log(process.env.ANTHROPIC_API_KEY ? 'Claude：使用环境变量 ANTHROPIC_API_KEY' : 'Claude：未设置 ANTHROPIC_API_KEY，可在网页「设置」里填写，或改用其他 AI 提供商');
});
