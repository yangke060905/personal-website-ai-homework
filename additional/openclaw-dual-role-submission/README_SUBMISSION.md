# OpenClaw 双角色闭环聊天 APP 提交包

## 目录说明

- `code/openclaw-dual-role-chat/`：完整可运行项目代码
- `report/FINAL_REPORT.md`：最终提交报告
- `report/SCORING_CHECKLIST.md`：评分点对照
- `report/SUBMISSION_GUIDE.md`：运行和演示说明
- `report/OPENCLAW_STATUS.txt`：本机 OpenClaw 状态证明
- `report/SAMPLE_DIALOGUE_LOCAL_DEMO.md`：本地示例脚本的流程样例
- `screenshots/`：运行截图

## 快速运行

```powershell
cd code\openclaw-dual-role-chat
npm start
```

打开：

```text
http://127.0.0.1:5179
```

## 提交重点

本项目重点展示：

- 两个角色自动交替发言
- 角色身份、目标、资料、禁止事项和结束条件可配置
- 最大轮数、停止词、人工停止和异常停止
- Markdown / JSON 导出
- OpenClaw 真实生成通道接入

`本地示例脚本` 模式只用于展示 UI 流程，不作为 OpenClaw 生成结果。
