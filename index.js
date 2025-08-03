const express = require("express");
const app = express();

app.use(express.json());
app.use(express.static("public"));

// Webhook送信関数
async function sendWebhook(url, data) {
    try {
        const response = await fetch(url, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify(data),
        });

        if (response.ok) {
            console.log(`✅ Webhook送信成功: ${url}`);
            return { success: true, status: response.status };
        } else {
            console.log(
                `❌ Webhook送信失敗: ${url} - Status: ${response.status}`,
            );
            return { success: false, status: response.status };
        }
    } catch (error) {
        console.log(`❌ Webhook送信エラー: ${url} - ${error.message}`);
        return { success: false, error: error.message };
    }
}

// 複数のWebhookを一度に送信
async function sendMultipleWebhooks(webhooks, data) {
    const results = [];

    for (const webhook of webhooks) {
        const result = await sendWebhook(webhook, data);
        results.push({ url: webhook, ...result });

        // 送信間隔を設ける（レート制限対策）
        await new Promise((resolve) => setTimeout(resolve, 100));
    }

    return results;
}

// Discord Webhook専用送信関数
async function sendDiscordWebhook(
    url,
    content,
    username = "Webhook Bot",
    avatarUrl = null,
) {
    const data = {
        content: content,
        username: username,
    };

    if (avatarUrl) {
        data.avatar_url = avatarUrl;
    }

    return await sendWebhook(url, data);
}

// API Routes
app.post("/send-webhook", async (req, res) => {
    const { url, data } = req.body;

    if (!url || !data) {
        return res.status(400).json({ error: "URLとdataが必要です" });
    }

    const result = await sendWebhook(url, data);
    res.json(result);
});

app.post("/send-multiple-webhooks", async (req, res) => {
    const { urls, data } = req.body;

    if (!urls || !Array.isArray(urls) || !data) {
        return res.status(400).json({ error: "URLsの配列とdataが必要です" });
    }

    const results = await sendMultipleWebhooks(urls, data);
    res.json(results);
});

app.post("/send-discord-webhook", async (req, res) => {
    const { url, content, username, avatarUrl } = req.body;

    if (!url || !content) {
        return res.status(400).json({ error: "URLとcontentが必要です" });
    }

    const result = await sendDiscordWebhook(url, content, username, avatarUrl);
    res.json(result);
});

// スパム送信（指定回数送信）
app.post("/spam-webhook", async (req, res) => {
    const { url, data, count = 10, delay = 1000 } = req.body;

    if (!url || !data) {
        return res.status(400).json({ error: "URLとdataが必要です" });
    }

    const results = [];

    for (let i = 0; i < count; i++) {
        const result = await sendWebhook(url, { ...data, index: i + 1 });
        results.push({ attempt: i + 1, ...result });

        if (i < count - 1) {
            await new Promise((resolve) => setTimeout(resolve, delay));
        }
    }

    res.json({ totalSent: count, results });
});

// テスト用のWebhookエンドポイント
app.post("/test-webhook", (req, res) => {
    console.log("🔔 Webhook受信:", req.body);
    res.json({ received: true, timestamp: new Date().toISOString() });
});

// メインページ
app.get("/", (req, res) => {
    res.send(`
        <h1>Webhook送信ツール</h1>
        <h2>利用可能なエンドポイント:</h2>
        <ul>
            <li><strong>POST /send-webhook</strong> - 単一Webhook送信</li>
            <li><strong>POST /send-multiple-webhooks</strong> - 複数Webhook送信</li>
            <li><strong>POST /send-discord-webhook</strong> - Discord Webhook送信</li>
            <li><strong>POST /spam-webhook</strong> - スパム送信</li>
            <li><strong>POST /test-webhook</strong> - テスト用受信</li>
        </ul>
        
        <h3>使用例:</h3>
        <pre>
// 単一送信
fetch('/send-webhook', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
        url: 'https://example.com/webhook',
        data: { message: 'Hello World!' }
    })
});

// 複数送信
fetch('/send-multiple-webhooks', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
        urls: ['https://example1.com/webhook', 'https://example2.com/webhook'],
        data: { message: 'Hello Multiple!' }
    })
});

// Discord送信
fetch('/send-discord-webhook', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
        url: 'https://discord.com/api/webhooks/YOUR_WEBHOOK_URL',
        content: 'Discord Hello!',
        username: 'Bot名前'
    })
});

// スパム送信
fetch('/spam-webhook', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
        url: 'https://example.com/webhook',
        data: { message: 'Spam message!' },
        count: 5,
        delay: 500
    })
});
        </pre>
    `);
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, "0.0.0.0", () => {
    console.log(
        `🚀 Webhook送信サーバーが http://0.0.0.0:${PORT} で起動しました`,
    );
    console.log("📡 使用可能なエンドポイント:");
    console.log("  - POST /send-webhook");
    console.log("  - POST /send-multiple-webhooks");
    console.log("  - POST /send-discord-webhook");
    console.log("  - POST /spam-webhook");
    console.log("  - POST /test-webhook");
});
