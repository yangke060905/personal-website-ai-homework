# 提交说明

## 推荐提交文件

建议提交整个压缩包：

```text
openclaw-dual-role-submission.zip
```

压缩包内包含：

- `code/`：完整项目代码
- `report/`：最终报告、评分对照、提交说明
- `screenshots/`：运行截图

## 本地运行检查

```powershell
cd D:\25216\Codex\projects\openclaw-dual-role-chat
npm start
```

打开：

```text
http://127.0.0.1:5179
```

## 演示步骤

1. 选择角色模板。
2. 检查两个角色的目标、资料、禁止事项和结束条件。
3. 选择 `OpenClaw 真实生成`。
4. 点击“开始自动对话”。
5. 如 OpenClaw 响应慢，可展示错误停止机制。
6. 切换到 `本地示例脚本` 展示完整 UI 流程。
7. 点击“导出 MD”生成对话记录。

## 注意事项

- 不要提交 API Key。
- 不要把 `C:\Users\25216\.openclaw\openclaw.json` 放进作业包。
- 如果老师要求“必须真实模型生成”，优先用 `OpenClaw 真实生成` 跑出一份成功记录后再导出。
