class WebhookSpammer {
    constructor() {
        this.isRunning = false;
        this.currentCount = 0;
        this.totalCount = 0;
        this.stopRequested = false;

        this.initElements();
        this.bindEvents();
    }

    initElements() {
        this.elements = {
            webhookUrlsContainer: document.getElementById(
                "webhookUrlsContainer",
            ),
            addWebhookUrl: document.getElementById("addWebhookUrl"),
            username: document.getElementById("username"),
            avatarUrl: document.getElementById("avatarUrl"),
            message: document.getElementById("message"),
            addTimestamp: document.getElementById("addTimestamp"),
            addCounter: document.getElementById("addCounter"),
            randomText: document.getElementById("randomText"),
            count: document.getElementById("count"),
            delay: document.getElementById("delay"),
            startBtn: document.getElementById("startBtn"),
            stopBtn: document.getElementById("stopBtn"),
            testBtn: document.getElementById("testBtn"),
            progressFill: document.getElementById("progressFill"),
            status: document.getElementById("status"),
            counter: document.getElementById("counter"),
            log: document.getElementById("log"),
            clearLog: document.getElementById("clearLog"),
        };
    }

    bindEvents() {
        this.elements.startBtn.addEventListener("click", () =>
            this.startSpam(),
        );
        this.elements.stopBtn.addEventListener("click", () => this.stopSpam());
        this.elements.testBtn.addEventListener("click", () =>
            this.sendTestMessage(),
        );
        this.elements.clearLog.addEventListener("click", () => this.clearLog());
        this.elements.addWebhookUrl.addEventListener("click", () =>
            this.addWebhookUrlField(),
        );
    }

    addWebhookUrlField() {
        const webhookItem = document.createElement("div");
        webhookItem.className = "webhook-url-item";
        webhookItem.innerHTML = `
            <input type="url" class="webhook-url-input" placeholder="Discord Webhook URL を入力">
            <button class="btn-remove" onclick="removeWebhookUrl(this)">❌</button>
        `;
        this.elements.webhookUrlsContainer.appendChild(webhookItem);
    }

    getWebhookUrls() {
        const inputs =
            this.elements.webhookUrlsContainer.querySelectorAll(
                ".webhook-url-input",
            );
        return Array.from(inputs)
            .map((input) => input.value.trim())
            .filter((url) => url.length > 0);
    }

    generateMessage(index) {
        let message = this.elements.message.value;

        if (this.elements.addCounter.checked) {
            message += ` [${index}/${this.totalCount}]`;
        }

        if (this.elements.addTimestamp.checked) {
            message += ` (${new Date().toLocaleString()})`;
        }

        if (this.elements.randomText.checked) {
            const randomTexts = [
                "🎉",
                "✨",
                "🚀",
                "💥",
                "⭐",
                "🔥",
                "💯",
                "🎯",
            ];
            message += ` ${randomTexts[Math.floor(Math.random() * randomTexts.length)]}`;
        }

        return message;
    }

    async sendWebhookToUrl(webhookUrl, message, index, urlIndex) {
        const username = this.elements.username.value || "Webhook Bot";
        const avatarUrl = this.elements.avatarUrl.value;

        const payload = {
            content: message,
            username: username,
        };

        if (avatarUrl) {
            payload.avatar_url = avatarUrl;
        }

        try {
            const response = await fetch(webhookUrl, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify(payload),
            });

            if (response.ok) {
                this.log(
                    `✅ URL${urlIndex + 1} 送信成功 #${index}: ${message.substring(0, 30)}...`,
                    "success",
                );
                return true;
            } else if (response.status === 429) {
                const retryAfter = Math.min(parseInt(response.headers.get("retry-after") || 1), 5);
                this.log(
                    `⚠️ URL${urlIndex + 1} レート制限 #${index}: ${retryAfter}秒後に再試行`,
                    "info",
                );
                await this.sleep(retryAfter * 1000);
                return await this.sendWebhookToUrl(
                    webhookUrl,
                    message,
                    index,
                    urlIndex,
                );
            } else {
                this.log(
                    `❌ URL${urlIndex + 1} 送信失敗 #${index}: HTTP ${response.status}`,
                    "error",
                );
                return false;
            }
        } catch (error) {
            this.log(
                `❌ URL${urlIndex + 1} エラー #${index}: ${error.message}`,
                "error",
            );
            return false;
        }
    }

    async sendWebhook(message, index) {
        const webhookUrls = this.getWebhookUrls();
        let successCount = 0;

        for (let i = 0; i < webhookUrls.length; i++) {
            const success = await this.sendWebhookToUrl(
                webhookUrls[i],
                message,
                index,
                i,
            );
            if (success) successCount++;

            // 複数URLの場合は少し間隔を空ける
            if (i < webhookUrls.length - 1) {
                await this.sleep(100);
            }
        }

        return successCount > 0;
    }

    async startSpam() {
        if (!this.validateInputs()) return;

        this.isRunning = true;
        this.stopRequested = false;
        this.currentCount = 0;
        this.totalCount = parseInt(this.elements.count.value);

        this.elements.startBtn.disabled = true;
        this.elements.stopBtn.disabled = false;
        this.elements.status.textContent = "送信中...";

        this.log(`🚀 大量送信開始: ${this.totalCount}回`, "info");

        const delay = parseInt(this.elements.delay.value);
        let successCount = 0;

        for (let i = 1; i <= this.totalCount; i++) {
            if (this.stopRequested) {
                this.log("⏹️ ユーザーによって停止されました", "info");
                break;
            }

            this.currentCount = i;
            this.updateProgress();

            const message = this.generateMessage(i);
            const success = await this.sendWebhook(message, i);

            if (success) successCount++;

            if (i < this.totalCount && !this.stopRequested) {
                await this.sleep(delay);
            }
        }

        this.isRunning = false;
        this.elements.startBtn.disabled = false;
        this.elements.stopBtn.disabled = true;
        this.elements.status.textContent = "完了";

        this.log(
            `🏁 送信完了: 成功 ${successCount}/${this.currentCount}`,
            "info",
        );
    }

    stopSpam() {
        this.stopRequested = true;
        this.elements.status.textContent = "停止中...";
        this.log("⏹️ 停止要求を受信しました", "info");
    }

    async sendTestMessage() {
        if (!this.validateInputs()) return;

        this.elements.testBtn.disabled = true;
        this.log("🧪 テスト送信中...", "info");

        const message = this.generateMessage(1) || "テストメッセージ 🧪";
        const success = await this.sendWebhook(message, "TEST");

        if (success) {
            this.log("✅ テスト送信が成功しました", "success");
        }

        this.elements.testBtn.disabled = false;
    }

    validateInputs() {
        const webhookUrls = this.getWebhookUrls();
        const message = this.elements.message.value;

        if (webhookUrls.length === 0) {
            alert("最低1つのWebhook URLを入力してください");
            return false;
        }

        for (const url of webhookUrls) {
            if (!url.includes("discord.com/api/webhooks/")) {
                alert(
                    "全てのURLが有効なDiscord Webhook URLである必要があります",
                );
                return false;
            }
        }

        if (
            !message &&
            !this.elements.addTimestamp.checked &&
            !this.elements.addCounter.checked
        ) {
            alert("メッセージを入力するか、追加オプションを選択してください");
            return false;
        }

        return true;
    }

    updateProgress() {
        const progress = (this.currentCount / this.totalCount) * 100;
        this.elements.progressFill.style.width = `${progress}%`;
        this.elements.counter.textContent = `送信済み: ${this.currentCount} / ${this.totalCount}`;
    }

    log(message, type = "info") {
        const entry = document.createElement("div");
        entry.className = `log-entry log-${type}`;
        entry.textContent = `[${new Date().toLocaleTimeString()}] ${message}`;

        this.elements.log.appendChild(entry);
        this.elements.log.scrollTop = this.elements.log.scrollHeight;
    }

    clearLog() {
        this.elements.log.innerHTML = "";
    }

    sleep(ms) {
        return new Promise((resolve) => setTimeout(resolve, ms));
    }
}

// グローバル関数（HTMLから呼び出し用）
function removeWebhookUrl(button) {
    const item = button.parentElement;
    const container = item.parentElement;

    // 最低1つは残す
    if (container.children.length > 1) {
        item.remove();
    } else {
        alert("最低1つのWebhook URLは必要です");
    }
}

// アプリケーション初期化
document.addEventListener("DOMContentLoaded", () => {
    window.webhookSpammer = new WebhookSpammer();

    // デフォルトメッセージ設定
    document.getElementById("message").value = "Hello from webhook spammer! 🚀";
});

// ページ離脱時の警告
window.addEventListener("beforeunload", (e) => {
    const spammer = window.webhookSpammer;
    if (spammer && spammer.isRunning) {
        e.preventDefault();
        e.returnValue = "送信中です。ページを離れますか？";
    }
});
