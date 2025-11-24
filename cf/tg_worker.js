/**
 * Telegram API Proxy Worker
 * 
 * 部署说明：
 * 1. 登录 Cloudflare Dashboard
 * 2. 进入 Workers & Pages -> Create Application -> Create Worker
 * 3. 命名为 "tg-proxy" (或其他你喜欢的名字) -> Deploy
 * 4. 点击 "Edit code"，将本文件内容复制进去覆盖原代码
 * 5. 点击 "Save and deploy"
 * 6. 复制你的 Worker 域名 (例如: tg-proxy.your-name.workers.dev)
 * 7. 在 cf_config.conf 中填入: TG_API_HOST="你的Worker域名"
 */

export default {
    async fetch(request, env, ctx) {
        const url = new URL(request.url);

        // 只允许 POST 请求 (Telegram Bot API 通常使用 POST)
        if (request.method !== "POST") {
            return new Response("Only POST requests are allowed.", { status: 405 });
        }

        // 构建目标 URL: https://api.telegram.org + 路径
        // 例如: https://your-worker.dev/botTOKEN/sendMessage -> https://api.telegram.org/botTOKEN/sendMessage
        const targetUrl = `https://api.telegram.org${url.pathname}${url.search}`;

        // 创建新请求
        const newRequest = new Request(targetUrl, {
            method: request.method,
            headers: request.headers,
            body: request.body
        });

        // 发送请求到 Telegram
        try {
            const response = await fetch(newRequest);
            return response;
        } catch (e) {
            return new Response("Error connecting to Telegram API: " + e.message, { status: 500 });
        }
    }
};
