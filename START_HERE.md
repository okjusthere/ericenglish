# START HERE

## 你要交给 Codex 的文件

把以下三个文件放进一个新的空 Git 仓库根目录：

```text
01_Eric_English_OS_Product_and_Implementation_Plan.md
02_Eric_English_OS_Codex_Master_Prompt.md
03_Cloudflare_Deployment_and_Owner_Setup.md
```

## 给 Codex 的第一句话

直接发送：

```text
Read 01_Eric_English_OS_Product_and_Implementation_Plan.md,
02_Eric_English_OS_Codex_Master_Prompt.md, and
03_Cloudflare_Deployment_and_Owner_Setup.md in full.
Then execute the master prompt end to end. Start from this empty repository,
implement the complete production V1, run all tests, provision the required
Cloudflare resources, and deploy it. Do not stop at scaffolding or a mock UI.
Only interrupt me when an external credential or owner-only Cloudflare action
is genuinely required; finish everything else first.
```

## Codex 中途需要你提供的内容

通常只有：

```text
OWNER_EMAIL
Cloudflare login or scoped API token
Cloudflare Account ID
AI provider keys/model names
Optional custom domain
```

不要把密钥直接提交到 Git。优先通过 Wrangler Secret 或 Cloudflare AI Gateway BYOK 设置。

## 你应拒绝 Codex 的“假完成”

如果 Codex 只给出：

- React 页面
- 一个聊天窗口
- 静态单词卡
- 无持久化 mock data
- 没有 D1/R2/Workflows
- 没有测试
- 没有 Cloudflare 部署

则任务没有完成。

要求它继续，直到 master prompt 中的 `Required final verification` 全部通过。

## 上线后第一步

1. 完成 Baseline Assessment。
2. 设置默认每天 60 分钟。
3. 选择 12 周 Accelerator。
4. 当天完成第一场 speaking session。
5. 开启 daily real-world mission。
