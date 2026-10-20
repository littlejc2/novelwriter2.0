// 转发其他 AI 接口的请求（避免浏览器跨域），流式返回原样交给浏览器；不记录、不保存 Key
const HOSTS = new Set(['generativelanguage.googleapis.com', 'api.deepseek.com', 'api.minimax.cn', 'api.minimax.io', 'api.minimaxi.com', 'open.bigmodel.cn', 'api.z.ai']);
const PASS_HEADERS = ['authorization', 'x-api-key', 'anthropic-version', 'accept'];

export async function onRequestPost({ request }) {
    let target;
    try { target = new URL(request.headers.get('x-target-url') || ''); } catch (e) { target = null; }
    if (!target || target.protocol !== 'https:' || !HOSTS.has(target.hostname)) {
        return Response.json({ error: { message: '不允许代理这个地址' } }, { status: 403 });
    }
    const headers = { 'content-type': 'application/json' };
    for (const h of PASS_HEADERS) {
        const v = request.headers.get(h);
        if (v) headers[h] = v;
    }
    try {
        const upstream = await fetch(target, { method: 'POST', headers, body: await request.text() });
        return new Response(upstream.body, {
            status: upstream.status,
            headers: { 'content-type': upstream.headers.get('content-type') || 'application/json', 'cache-control': 'no-store' }
        });
    } catch (e) {
        return Response.json({ error: { message: `连接 ${target.hostname} 失败：${(e && e.message) || e}` } }, { status: 502 });
    }
}
