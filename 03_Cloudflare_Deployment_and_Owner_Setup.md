# Eric English OS
## Cloudflare 部署与 Owner 配置清单

本文档区分两类工作：

- Codex 可以自动完成的代码和资源操作。
- 由于账号登录或密钥保密，需要 Eric 完成的一次性操作。

---

# 1. 推荐的 Cloudflare 资源命名

```text
Worker:        eric-english-os
D1:            eric-english-os-db
R2:            eric-english-os-audio
AI Gateway:    eric-english-os-ai
Workflow:      session-analysis
Workflow:      weekly-report
Workflow:      curriculum-bootstrap
Custom domain: english.<your-domain.com>   # optional
```

所有名称都应可通过环境变量或脚本参数覆盖。

---

# 2. Owner 需要准备的信息

不要把以下值写进 Git：

```text
OWNER_EMAIL
CLOUDFLARE_ACCOUNT_ID
CLOUDFLARE_API_TOKEN
AI_GATEWAY_TOKEN
UPSTREAM MODEL KEYS
OPTIONAL CUSTOM DOMAIN
```

## Cloudflare API Token 建议权限

最小化权限。根据自动化范围，可能需要：

- Workers Scripts: Edit
- D1: Edit
- R2: Edit
- Account Settings: Read
- AI Gateway: Read/Edit/Run
- Access Apps and Policies: Edit（若自动创建 Access）
- Zone DNS: Edit（仅自定义域名需要）

限制 token 只作用于目标 Cloudflare account/zone。

---

# 3. Cloudflare Access

## 推荐方式

使用 Cloudflare Access 保护整个 Worker，并只允许：

- Eric 的单个 email；或
- Eric 自己的 Cloudflare account membership。

不要使用：

- Allow Everyone
- 只按国家/IP 保护
- 公开登录注册

## 登录方式

优先：Cloudflare identity provider / Cloudflare account member。

备选：One-Time PIN 发送到允许的单个 email。

## 验证

部署后必须完成：

1. 未登录的无痕浏览器访问 URL，出现 Access login/block。
2. 非 allowlist email 无法进入。
3. owner email 可以进入。
4. production、preview 和 workers.dev 路径都受到保护。

如果未来启用 WebSocket 服务，改用 hostname-based Access；Worker-level Access 对 WebSocket 有限制。

---

# 4. AI Gateway 与模型密钥

## 推荐

在 Cloudflare AI Gateway 中使用 BYOK / Secrets Store 保存 provider key。

至少配置：

```text
TEXT_FAST_MODEL
TEXT_STRONG_MODEL
CONTENT_MODEL
STT_MODEL
TTS_MODEL
```

实际模型名称通过环境变量配置，不写死在代码中。

## 路由建议

```text
daily_fast        -> 快速低成本文本模型
evaluator_strong  -> 较强文本模型
content_generator -> 成本适中的批量内容模型
stt               -> 专用语音转写模型
tts               -> 低成本自然语音模型或 browser fallback
```

## 隐私设置

对于真实用户内容，应用代码应发送：

```text
cf-aig-collect-log: false
cf-aig-skip-cache: true
cf-aig-zdr: true   # supported Unified Billing route only
```

AI Gateway 默认日志设置也建议关闭 request/response body 存储，尤其是将真实客户沟通用于训练时。

---

# 5. Wrangler 配置要求

`wrangler.jsonc` 应包含：

- current compatibility date
- nodejs compatibility flag only if dependencies need it
- Worker entry
- static assets output
- D1 binding
- R2 binding
- Workflow bindings
- hourly Cron trigger
- observability logs
- traces with reasonable sampling
- development Access identity or documented local bypass

示意，不应机械复制 ID：

```jsonc
{
  "$schema": "./node_modules/wrangler/config-schema.json",
  "name": "eric-english-os",
  "main": "src/worker/index.ts",
  "compatibility_date": "2026-08-30",
  "compatibility_flags": ["nodejs_compat"],
  "assets": {
    "directory": "./dist/client",
    "binding": "ASSETS"
  },
  "d1_databases": [
    {
      "binding": "DB",
      "database_name": "eric-english-os-db",
      "database_id": "<generated>"
    }
  ],
  "r2_buckets": [
    {
      "binding": "AUDIO_BUCKET",
      "bucket_name": "eric-english-os-audio"
    }
  ],
  "triggers": {
    "crons": ["0 * * * *"]
  },
  "observability": {
    "enabled": true,
    "logs": { "head_sampling_rate": 1 },
    "traces": { "enabled": true, "head_sampling_rate": 0.2 }
  }
}
```

最终结构应以当前 Wrangler schema 和实际框架输出为准。

---

# 6. Worker Secrets / Variables

建议变量：

```text
APP_ENV=production
APP_TIMEZONE=America/New_York
SINGLE_USER_ID=primary
OWNER_EMAIL=<owner email>
AUDIO_RETENTION_DAYS=30
DEFAULT_DAILY_MINUTES=60
AI_PROVIDER_MODE=cloudflare_gateway
AI_GATEWAY_ACCOUNT_ID=<...>
AI_GATEWAY_ID=eric-english-os-ai
AI_GATEWAY_API_BASE=<...>
AI_MODEL_FAST=<...>
AI_MODEL_STRONG=<...>
AI_MODEL_CONTENT=<...>
AI_MODEL_STT=<...>
AI_MODEL_TTS=<...>
MONTHLY_AI_BUDGET_USD=<...>
```

Secrets：

```text
AI_GATEWAY_TOKEN
DIRECT_LLM_API_KEY          # only if direct fallback used
DIRECT_STT_API_KEY          # only if needed
DIRECT_TTS_API_KEY          # only if needed
```

非 secret model names 可放 vars；密钥必须使用 `wrangler secret put` 或 AI Gateway BYOK。

---

# 7. 本地开发

预期命令：

```bash
corepack enable
pnpm install
cp .dev.vars.example .dev.vars
pnpm db:migrate:local
pnpm db:seed:local
pnpm dev
```

默认 Mock AI 应使应用无需付费 API 即可完整演示。

启用真实 API 后运行：

```bash
pnpm ai:health
```

---

# 8. 生产资源创建

Codex 的 bootstrap 脚本应优先执行：

```bash
npx wrangler whoami
npx wrangler d1 create eric-english-os-db
npx wrangler r2 bucket create eric-english-os-audio
npx wrangler d1 migrations apply eric-english-os-db --remote
pnpm db:seed:remote
npx wrangler deploy
```

脚本必须能够识别资源已存在并安全重跑。

---

# 9. GitHub Actions

Repository Secrets：

```text
CLOUDFLARE_ACCOUNT_ID
CLOUDFLARE_API_TOKEN
```

PR workflow：

```text
install -> lint -> typecheck -> tests -> build -> mocked E2E
```

Main workflow：

```text
install
-> quality gates
-> apply D1 migrations
-> deploy
-> production smoke test
```

模型 provider key 不应进入 GitHub Secrets，除非未使用 AI Gateway BYOK。

---

# 10. Production Smoke Test

部署后，Codex 必须验证：

```text
GET /health
Access protection
app shell loads
GET /api/today
database read/write
R2 test upload/delete
mock or real AI provider health
one review submission
one writing submission
one text speaking turn
one capture
progress summary
```

语音测试可使用一段短测试音频，不得把真实私人录音提交到仓库。

---

# 11. 数据备份与恢复

## D1

- 使用 D1 Time Travel 进行短期点时恢复。
- 可选每月运行 Workflow，将 D1 export 保存到 R2。
- 所有 migrations 提交到 Git。

## R2

- 原始语音默认 30 天删除。
- 用户触发删除时立即删除。
- export 使用独立 prefix 并设置过期策略。

---

# 12. 预计成本结构

固定基础设施：

- 推荐 Cloudflare Workers Paid 最低月费。
- 单用户 D1/R2 使用预计很低。
- AI Gateway 核心功能本身通常不是主要成本。

浮动成本：

- 文本模型
- 语音转写
- TTS
- 可选实时语音

成本控制应依赖：

- fast/strong model routing
- daily/monthly budget guard
- batch generation pause
- no caching for personal content
- browser TTS fallback
- audio retention limits

---

# 13. Owner 最终一次性操作

当 Codex 完成代码后，Eric 通常只需要：

1. 登录/授权 Wrangler。
2. 提供 owner email。
3. 在 AI Gateway 中添加已有 provider keys，或通过安全方式设置 Worker secrets。
4. 可选提供 custom domain。
5. 在 Access 页面确认 allowlist。
6. 完成首次测评。

其余代码、迁移、种子、测试和部署应由 Codex 执行。
