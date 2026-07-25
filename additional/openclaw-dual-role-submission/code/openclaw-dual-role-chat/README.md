# OpenClaw 双角色闭环聊天 Demo

这是一个课程加分题 Demo：用 OpenClaw 编排两个预设角色进行有限轮次自动对话，并提供停止机制、角色边界、异常兜底和交付文档。

## 运行

```powershell
cd D:\25216\Codex\projects\openclaw-dual-role-chat
npm start
```

打开：

```text
http://127.0.0.1:5179
```

## 功能

- 三组角色模板：产品经理/风险官、金融顾问/谨慎客户、研究员/事实核查员
- 每个角色可编辑身份、目标、可用资料、禁止事项、结束条件
- 两个角色自动轮流发言
- 最大轮数强制限制为 1 到 6
- 支持停止词
- 支持人工停止
- OpenClaw 调用失败时显示错误并停止，不用模板冒充模型回答
- 保留“本地示例脚本”模式，仅用于演示流程和课堂预备
- 支持导出 Markdown 报告和 JSON 原始记录

## OpenClaw 调用方式

后端通过 OpenClaw CLI 调用：

```powershell
openclaw agent --agent main --session-key <conversation> --message-file <prompt> --thinking off --timeout 45 --json
```

默认单轮等待约 49 秒。需要更长等待时可设置：

```powershell
$env:OPENCLAW_TURN_TIMEOUT_SECONDS=60
npm start
```

实现位置：

- `server.js`
- `public/app.js`

## 文档

- `docs/PRD.md`
- `docs/DESIGN.md`
- `docs/KNOWN_ISSUES.md`

## 演示建议

1. 启动服务
2. 选择“产品经理 × 风险官”
3. 最大轮数保持 6
4. 模型通道选择 `OpenClaw 真实生成`
5. 点击“开始自动对话”
6. 展示停止原因并导出 Markdown 报告
