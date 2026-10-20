// 转发 Claude 请求到 Anthropic API，流式返回原样交给浏览器
const MODELS = new Set(['claude-opus-5-5', 'claude-sonnet-5-5', 'claude-haiku-5-5']);
const FALLBACK_MODELS = new Set(['claude-opus-5-5', 'claude-sonnet-5-5']);

export async function onRequestPost({ request, env }) {
    // 注意：设置了 ANTHROPIC_API_KEY 后，所有能打开网站的人都会用你的 Key，请先用 Cloudflare Access 保护网站
    const apiKey = env.ANTHROPIC_API_KEY || request.headers.get('x-user-api-key');
    if (!apiKey) {
        return Response.json({ error: { message: '没有 Anthropic API Key：请在网页「设置」里填写' } }, { status: 400 });
    }
    let body;
    try { body = await request.json(); } catch (e) { return Response.json({ error: { message: '请求格式错误' } }, { status: 400 }); }
    const model = MODELS.has(body.model) ? body.model : 'claude-opus-5-5';
    const payload = {
        model,
        max_tokens: 64000,
        stream: true,
        output_config: { effort: 'medium' },
        messages: [{ role: 'user', content: String(body.prompt || '') }]
    };
    if (body.system) payload.system = String(body.system);
    const headers = { 'content-type': 'application/json', 'x-api-key': apiKey, 'anthropic-version': '2023-06-01' };
    if (FALLBACK_MODELS.has(model)) {
        // 被安全分类器拒绝时，服务端自动换模型重试
        headers['anthropic-beta'] = 'server-side-fallback-2026-07-01';
        payload.fallbacks = 'default';
    }
    let upstream;
    try {
        upstream = await fetch('https://api.anthropic.com/v1/messages', { method: 'POST', headers, body: JSON.stringify(payload) });
    } catch (e) {
        return Response.json({ error: { message: `连接 Anthropic 失败：${(e && e.message) || e}` } }, { status: 502 });
    }
    if (!upstream.ok) {
        const err = await upstream.json().catch(() => ({}));
        return Response.json({ error: { message: (err.error && err.error.message) || `Anthropic API 错误 ${upstream.status}` } }, { status: upstream.status });
    }
    return new Response(upstream.body, { headers: { 'content-type': 'text/event-stream; charset=utf-8', 'cache-control': 'no-store' } });
}
