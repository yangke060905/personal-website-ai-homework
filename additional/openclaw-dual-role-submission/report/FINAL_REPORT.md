# OpenClaw 双角色闭环聊天 APP 提交报告

## 项目概述

本项目实现了一个“不会无限聊下去”的双角色聊天 APP。用户可以选择两个预设角色，编辑角色身份、目标、可用资料、禁止事项和结束条件，然后让两个角色按 A/B 顺序进行有限轮次对话。

项目默认提供 `OpenClaw 真实生成` 模式，通过本机 OpenClaw CLI 调用 `openclaw agent` 完成单轮角色生成；同时保留 `本地示例脚本` 模式，用于课堂演示 UI 流程和异常情况下的流程证明。两种模式在界面和导出文件中明确区分。

## 运行方式

```powershell
cd D:\25216\Codex\projects\openclaw-dual-role-chat
npm start
```

浏览器打开：

```text
http://127.0.0.1:5179
```

## 核心功能

- 三套角色模板：
  - 产品经理 × 风险官
  - 金融顾问 × 谨慎客户
  - 研究员 × 事实核查员
- 每个角色可配置：
  - 身份
  - 对话目标
  - 可用资料
  - 禁止事项
  - 结束条件
- 支持资料导入：
  - `.txt`
  - `.md`
  - `.csv`
  - `.json`
  - `.log`
- 支持自动交替对话：
  - A 角色发言
  - B 角色回应
  - 循环直到停止
- 停止机制：
  - 最大轮数强制限制为 6
  - 停止词
  - 角色自判停止
  - 人工停止按钮
  - OpenClaw 超时/异常停止
- 导出：
  - Markdown 报告
  - JSON 原始记录

## OpenClaw 使用说明

后端通过以下方式调用 OpenClaw：

```powershell
openclaw agent --agent main --session-key <conversation> --message-file <prompt> --thinking off --timeout 45 --json
```

每一轮都会根据当前角色、对方角色、资料和已有对话构造独立 prompt。模型需要返回结构化 JSON：

```json
{
  "message": "角色发言",
  "shouldStop": false,
  "stopReason": ""
}
```

如果 OpenClaw 调用超时或返回格式异常，APP 会显示错误并停止，不使用本地脚本冒充模型回答。

## 已知问题

- OpenClaw/DeepSeek 在本机有时响应较慢，真实生成模式可能出现单轮超时。
- OpenClaw 主 agent 本身有个人助手系统提示，角色扮演需要通过强 prompt 约束。
- 当前项目没有数据库，刷新页面后需要重新运行或导出。

## 反思

这个加分题的关键不是让 AI 一直聊天，而是把自动对话的边界设计清楚。本项目选择“前端调度 + 后端单轮调用”的方式，是为了让每一轮都可控，也让停止按钮真正有效。

相比单纯聊天，本项目更强调：

- 角色有边界
- 资料有来源
- 轮次有限制
- 异常能停止
- 结果能导出和复查
