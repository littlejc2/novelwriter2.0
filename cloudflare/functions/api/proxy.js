// 转发其他 AI 接口（避免浏览器跨域限制），只允许下列域名
const HOSTS = new Set([
    'generativelanguage.googleapis.com',
    'api.deepseek.com',
    'api.minimax.cn',
    'api.minimax.io',
    'open.bigmodel.cn'
]);

export async function onRequestPost({ request }) {
    let target;
    try { target = new URL(request.headers.get('x-target-url') || ''); } catch (e) { target = null; }
    if (!target || target.protocol !== 'https:' || !HOSTS.has(target.hostname)) {
        return Response.json({ error: { message: '不允许代理这个地址' } }, { status: 403 });
    }
    const headers = { 'content-type': 'application/json' };
    const auth = request.headers.get('authorization');
    if (auth) headers.authorization = auth;
    const upstream = await fetch(target, { method: 'POST', headers, body: await request.text() });
    return new Response(upstream.body, {
        status: upstream.status,
        headers: { 'content-type': upstream.headers.get('content-type') || 'application/json', 'cache-control': 'no-store' }
    });
}
