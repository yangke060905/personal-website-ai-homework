# 最终报告：个人网站规范化 AI 开发

## 1. 项目定位

本网站面向课程教师、同学和未来项目伙伴，目标是展示我作为深圳大学金融科技专业学生在金融科技产品、财务与行业研究、数据工具和 AI 协作系统方面的学习方向。本期重点展示个人简介、能力方向、经历轨迹和三个项目通道。

## 2. 模板选择

本项目采用轻量静态 HTML/CSS/JavaScript 模板，原因是：

- 能直接通过 GitHub Pages 发布。
- 文件结构简单，便于理解、修改和验证。
- 不引入复杂框架或无关依赖，适合课堂时间内完成。
- 视觉方案参考 `taste-skill` 和 `impeccable` 的前端审美规则，并吸收本地学习 Vault 的路线图和系统架构表达。

## 3. 主要修改

- 根据作业要求建立 Hero、About、Skills、Projects、Contact 五个基础区块。
- 将私人简历内容筛选为适合公开展示的作品集版本。
- 将页面重做为成熟个人产品主页，加入个人概览卡、证据条、能力地图、项目案例和经历轨迹。
- 建立 `README.md`、`docs/prd.md`、`docs/design.md`、`docs/checklist.md` 和报告模板。

## 4. AI 参与与个人判断

AI 主要参与了项目结构搭建、规格文档整理、代码修改建议、页面实现和验证辅助。本人负责确认真实内容、隐私边界、项目范围和最终验收结果。公开信息保留方向、能力、项目概述和部分经历，不公开课程邀请码、作业代码、平台密码、API Key、Token 或私人联系方式。

关键判断包括：不使用复杂框架，BA 只作为方向之一表达，项目区去掉个人网站作业自我引用卡，将第三个项目命名为“金智研途”，优先保证 GitHub Pages 可访问、文档完整和验证证据齐全。

## 5. 验证结果

- 本地桌面端预览：已使用浏览器打开 `index.html`，截图保存为 `screenshots/homepage-desktop.png`，未发现横向溢出。
- 本地手机端预览：已使用 390px 宽度移动端视口检查，截图保存为 `screenshots/homepage-mobile.png`，未发现横向溢出。
- 项目区截图：已保存为 `screenshots/projects-section.png`，用于证明 Projects 区块内容与最终页面一致。
- 前端审美检测：已使用 `impeccable` 检测脚本检查 HTML、CSS 和 JS，未发现反模式提示。
- 链接与导航检查：页面内部导航可跳转；GitHub 主页链接已更新为 `https://github.com/yangke060905`。
- GitHub Pages 访问：待 push 后在线验证。
- Checklist 完成情况：基础区块、桌面端和手机端本地检查已完成；GitHub Pages 截图和 TA-Claw 提交仍待完成。

GitHub 仓库：`https://github.com/yangke060905/personal-website-ai-homework`

GitHub Pages 链接：`https://yangke060905.github.io/personal-website-ai-homework/`

## 6. 问题与修复

- 问题：早期页面要么像普通简历，要么像海报式科技页，大标题和留白过重，观感不够成熟。
- 修复：重新组织视觉语言和信息架构，改为软绿灰背景、深绿强调、紧凑首屏、个人概览卡、能力地图和项目案例，并删除容易显得模板化的装饰网格与过度巨大标题。
- 验证：重新生成桌面端、手机端和项目区截图；浏览器检查显示无横向溢出，`impeccable` 检测脚本无反模式提示。

## 7. 后续计划

- 发布 GitHub Pages。
- 根据最终链接更新 README、报告和 Checklist。
- 保存 GitHub Pages 页面、Checklist 和必要的提交记录截图。
- 后续可继续补充项目详情页和长期学习记录。

## 8. 隐私检查

本项目不应包含密码、课程邀请码、API Key、Token、`.env` 文件、私人手机号、住址、身份证件或其他不适合公开的信息。提交前需再次检查仓库和截图。
