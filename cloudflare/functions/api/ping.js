// 告诉网页：这里有服务器转发 AI 请求，但小说仍保存在各自的浏览器里
export function onRequestGet({ env }) {
    return Response.json({ ok: true, storage: false, claudeKeyFromEnv: !!env.ANTHROPIC_API_KEY });
}
