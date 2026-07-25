const presets = [
  {
    id: "product-risk",
    label: "产品经理 × 风险官",
    topic: "讨论是否上线一个校园二手交易小程序的 AI 自动议价功能。",
    source: "背景：目标用户是大学生；上线周期 2 周；必须避免隐私泄露、诱导交易和价格欺诈。",
    roles: [
      {
        name: "产品经理",
        goal: "推动功能形成可上线的最小闭环，明确用户价值、流程和验收标准。",
        resources: "只能使用题目背景、用户输入、已有对话和常识性产品设计方法。",
        forbidden: "不得忽视安全、隐私和合规风险；不得承诺没有验证的数据。",
        stopCriteria: "当 MVP 范围、验收标准和需暂缓事项清楚时，主动收束。"
      },
      {
        name: "风险官",
        goal: "识别隐私、合规、误导交易和滥用风险，给出上线边界。",
        resources: "只能使用题目背景、用户输入、已有对话和常识性风险控制方法。",
        forbidden: "不得无依据否定所有方案；不得提出与课程 Demo 无关的大型治理体系。",
        stopCriteria: "当风险边界、拦截条件和人工介入点明确时，主动收束。"
      }
    ]
  },
  {
    id: "advisor-client",
    label: "金融顾问 × 谨慎客户",
    topic: "讨论一名学生是否应把短期生活费投入高波动资产。",
    source: "背景：资金 5000 元，3 个月内可能要用，用户风险承受能力低。",
    roles: [
      {
        name: "金融顾问",
        goal: "解释收益、风险和替代方案，帮助客户做稳健决策。",
        resources: "只能使用题目背景和常识性财务规划原则，不调用实时行情。",
        forbidden: "不得承诺收益；不得给出具体买卖指令；不得忽略流动性需求。",
        stopCriteria: "当客户理解风险并形成可执行的保守方案时停止。"
      },
      {
        name: "谨慎客户",
        goal: "持续追问本金安全、流动性和最坏情况，避免冲动决策。",
        resources: "只能基于自己的资金期限、风险偏好和已有对话提问。",
        forbidden: "不得要求保证收益；不得把建议理解为确定性承诺。",
        stopCriteria: "当资金安排和不可做事项清楚时停止。"
      }
    ]
  },
  {
    id: "research-checker",
    label: "研究员 × 事实核查员",
    topic: "讨论一份关于 AI 学习助手的课堂展示结论是否站得住。",
    source: "背景：展示需要 3 分钟完成，依据主要来自课堂观察和小样本访谈。",
    roles: [
      {
        name: "研究员",
        goal: "提出清晰观点、证据链和展示结构。",
        resources: "只能使用题目背景、已有对话和明确给出的材料。",
        forbidden: "不得编造调查数据；不得把小样本结论说成普遍事实。",
        stopCriteria: "当观点、证据限制和展示口径确定后停止。"
      },
      {
        name: "事实核查员",
        goal: "检查证据是否充分，指出表述中可能夸大的地方。",
        resources: "只能使用题目背景、已有对话和明确给出的材料。",
        forbidden: "不得引入未经提供的外部事实；不得只挑刺不给修改建议。",
        stopCriteria: "当高风险表述已被修正或标注限制后停止。"
      }
    ]
  }
];

const els = {
  presetSelect: document.querySelector("#presetSelect"),
  topicInput: document.querySelector("#topicInput"),
  sourceInput: document.querySelector("#sourceInput"),
  maxRoundsInput: document.querySelector("#maxRoundsInput"),
  providerSelect: document.querySelector("#providerSelect"),
  stopWordsInput: document.querySelector("#stopWordsInput"),
  startBtn: document.querySelector("#startBtn"),
  stopBtn: document.querySelector("#stopBtn"),
  resetBtn: document.querySelector("#resetBtn"),
  exportBtn: document.querySelector("#exportBtn"),
  exportMdBtn: document.querySelector("#exportMdBtn"),
  fileImportInput: document.querySelector("#fileImportInput"),
  chatLog: document.querySelector("#chatLog"),
  stopBanner: document.querySelector("#stopBanner"),
  runMeta: document.querySelector("#runMeta"),
  healthStatus: document.querySelector("#healthStatus"),
  roleAName: document.querySelector("#roleAName"),
  roleAGoal: document.querySelector("#roleAGoal"),
  roleAResources: document.querySelector("#roleAResources"),
  roleAForbidden: document.querySelector("#roleAForbidden"),
  roleAStop: document.querySelector("#roleAStop"),
  roleBName: document.querySelector("#roleBName"),
  roleBGoal: document.querySelector("#roleBGoal"),
  roleBResources: document.querySelector("#roleBResources"),
  roleBForbidden: document.querySelector("#roleBForbidden"),
  roleBStop: document.querySelector("#roleBStop")
};

let transcript = [];
let running = false;
let stopRequested = false;
let activeController = null;
let conversationId = "";
let pendingImportTarget = "";

function setHealth(ok, text) {
  const dot = els.healthStatus.querySelector(".dot");
  dot.classList.toggle("ok", ok);
  dot.classList.toggle("bad", !ok);
  els.healthStatus.querySelector("span:last-child").textContent = text;
}

async function checkHealth() {
  try {
    const res = await fetch("/api/health");
    const data = await res.json();
    setHealth(Boolean(data.openclawFound), data.openclawFound ? "OpenClaw 可用" : "OpenClaw 未找到");
  } catch {
    setHealth(false, "服务未连接");
  }
}

function loadPreset(id = presets[0].id) {
  const preset = presets.find(item => item.id === id) || presets[0];
  els.topicInput.value = preset.topic;
  els.sourceInput.value = preset.source;
  fillRole("A", preset.roles[0]);
  fillRole("B", preset.roles[1]);
  clearConversation();
}

function fillRole(side, role) {
  els[`role${side}Name`].value = role.name;
  els[`role${side}Goal`].value = role.goal;
  els[`role${side}Resources`].value = role.resources;
  els[`role${side}Forbidden`].value = role.forbidden;
  els[`role${side}Stop`].value = role.stopCriteria;
}

function readRole(side) {
  return {
    name: els[`role${side}Name`].value.trim(),
    goal: els[`role${side}Goal`].value.trim(),
    resources: els[`role${side}Resources`].value.trim(),
    forbidden: els[`role${side}Forbidden`].value.trim(),
    stopCriteria: els[`role${side}Stop`].value.trim()
  };
}

function stopWords() {
  return els.stopWordsInput.value
    .split(/[，,]/)
    .map(word => word.trim())
    .filter(Boolean);
}

function maxRounds() {
  const value = Number(els.maxRoundsInput.value);
  return Math.max(1, Math.min(6, Number.isFinite(value) ? Math.floor(value) : 6));
}

function cleanVisibleMessage(text) {
  return String(text || "")
    .replace(/\s*我已经参考上一句的重点[:：]“[^”]*”。?/g, "")
    .replace(/\s*我已参考上一句的重点[:：]“[^”]*”。?/g, "")
    .trim();
}

function render() {
  els.chatLog.innerHTML = "";
  if (!transcript.length) {
    const empty = document.createElement("div");
    empty.className = "empty";
    empty.textContent = "尚无对话";
    els.chatLog.appendChild(empty);
    return;
  }

  for (const item of transcript) {
    const message = document.createElement("article");
    message.className = `message ${item.side.toLowerCase()}${item.pending ? " pending" : ""}`;

    const header = document.createElement("div");
    header.className = "message-header";
    header.innerHTML = `<span class="tag">${item.side}</span><span>${escapeHtml(item.roleName)}</span><span>第 ${item.turnIndex} 句</span><span>${escapeHtml(item.provider)}</span>`;

    const bubble = document.createElement("div");
    bubble.className = "bubble";
    bubble.textContent = item.content;

    message.append(header, bubble);
    els.chatLog.appendChild(message);
  }
  els.chatLog.scrollTop = els.chatLog.scrollHeight;
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function setRunningState(next) {
  running = next;
  els.startBtn.disabled = next;
  els.stopBtn.disabled = !next;
  els.presetSelect.disabled = next;
  els.runMeta.textContent = next ? "运行中" : transcript.length ? `已生成 ${transcript.length} 句` : "等待开始";
}

function clearConversation() {
  transcript = [];
  stopRequested = false;
  els.stopBanner.hidden = true;
  els.stopBanner.textContent = "";
  render();
  els.runMeta.textContent = "等待开始";
}

async function requestTurn(side, turnIndex) {
  const role = side === "A" ? readRole("A") : readRole("B");
  const otherRole = side === "A" ? readRole("B") : readRole("A");
  activeController = new AbortController();

  const res = await fetch("/api/turn", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    signal: activeController.signal,
    body: JSON.stringify({
      conversationId,
      turnIndex,
      maxRounds: maxRounds(),
      provider: els.providerSelect.value,
      topic: els.topicInput.value.trim(),
      sourceMaterial: els.sourceInput.value.trim(),
      stopWords: stopWords(),
      role,
      otherRole,
      transcript
    })
  });

  const payload = await res.json();
  if (!payload.ok) {
    throw new Error(payload.error || "生成失败");
  }
  return payload.data;
}

async function startDialogue() {
  if (running) return;
  clearConversation();
  conversationId = `dual-role-${Date.now()}`;
  setRunningState(true);

  try {
    for (let i = 1; i <= maxRounds(); i++) {
      if (stopRequested) {
        showStop("人工停止。");
        break;
      }
      const side = i % 2 === 1 ? "A" : "B";
      els.runMeta.textContent = `${side} 正在生成第 ${i} 句`;
      const role = side === "A" ? readRole("A") : readRole("B");
      const pendingIndex = transcript.length;
      transcript.push({
        side,
        roleName: role.name,
        content: "生成中，请稍候...",
        provider: els.providerSelect.value === "openclaw" ? "openclaw pending" : "local pending",
        turnIndex: i,
        pending: true,
        at: new Date().toISOString()
      });
      render();

      const data = await requestTurn(side, i);
      transcript[pendingIndex] = {
        side,
        roleName: role.name,
        content: cleanVisibleMessage(data.message),
        provider: data.provider,
        warning: data.warning,
        turnIndex: i,
        at: new Date().toISOString()
      };
      render();

      if (data.warning) {
        console.warn("OpenClaw warning:", data.warning);
      }
      if (data.shouldStop) {
        showStop(data.stopReason || "角色判断应停止。");
        break;
      }
    }
    if (!els.stopBanner.hidden) return;
    if (transcript.length >= maxRounds()) {
      showStop(`达到最大轮数 ${maxRounds()}。`);
    }
  } catch (error) {
    if (error.name === "AbortError") {
      showStop("人工停止。");
    } else {
      const pending = transcript.find(item => item.pending);
      if (pending) {
        pending.pending = false;
        pending.provider = "openclaw-error";
        pending.content = error.message || "OpenClaw 本轮生成失败。";
        render();
      }
      showStop(`异常停止：${error.message}`);
    }
  } finally {
    activeController = null;
    setRunningState(false);
  }
}

function showStop(reason) {
  els.stopBanner.hidden = false;
  els.stopBanner.textContent = `已停止：${reason}`;
  els.runMeta.textContent = `停止于 ${transcript.length} 句`;
}

function stopDialogue() {
  stopRequested = true;
  if (activeController) {
    activeController.abort();
  }
  els.stopBtn.disabled = true;
}

function exportTranscript() {
  const payload = {
    exportedAt: new Date().toISOString(),
    topic: els.topicInput.value.trim(),
    sourceMaterial: els.sourceInput.value.trim(),
    maxRounds: maxRounds(),
    stopWords: stopWords(),
    roles: [readRole("A"), readRole("B")],
    transcript
  };
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `openclaw-dual-role-${Date.now()}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

function mdEscape(value) {
  return String(value || "").replace(/\r\n/g, "\n").trim();
}

function roleToMarkdown(title, role) {
  return [
    `## ${title}：${mdEscape(role.name)}`,
    "",
    `- 目标：${mdEscape(role.goal)}`,
    `- 可用资料：${mdEscape(role.resources)}`,
    `- 禁止事项：${mdEscape(role.forbidden)}`,
    `- 结束条件：${mdEscape(role.stopCriteria)}`
  ].join("\n");
}

function exportMarkdown() {
  const roleA = readRole("A");
  const roleB = readRole("B");
  const stopText = els.stopBanner.hidden ? "尚未触发停止" : els.stopBanner.textContent.replace(/^已停止：/, "");
  const localDemoItems = transcript.filter(item => /local-demo-script/i.test(item.provider || ""));
  const errorItems = transcript.filter(item => /openclaw-error/i.test(item.provider || ""));
  const runNote = localDemoItems.length
    ? "本次使用本地示例脚本，仅用于演示流程，不作为 OpenClaw 真实生成结果。"
    : errorItems.length
      ? "本次 OpenClaw 调用出现失败轮次，详见对话记录。"
      : "本次对话由 OpenClaw 生成。";
  const lines = [
    "# OpenClaw 双角色闭环聊天记录",
    "",
    `- 导出时间：${new Date().toLocaleString("zh-CN")}`,
    `- 模型通道：${els.providerSelect.options[els.providerSelect.selectedIndex].textContent}`,
    `- 最大轮数：${maxRounds()}`,
    `- 停止词：${stopWords().join("、") || "无"}`,
    `- 停止状态：${mdEscape(stopText)}`,
    `- 运行说明：${runNote}`,
    "",
    "## 讨论主题",
    "",
    mdEscape(els.topicInput.value) || "未填写",
    "",
    "## 可用资料",
    "",
    mdEscape(els.sourceInput.value) || "未填写",
    "",
    roleToMarkdown("角色 A", roleA),
    "",
    roleToMarkdown("角色 B", roleB),
    "",
    "## 对话记录",
    ""
  ];

  if (!transcript.length) {
    lines.push("暂无对话。");
  } else {
    for (const item of transcript) {
      lines.push(`### 第 ${item.turnIndex} 句｜${item.side}｜${mdEscape(item.roleName)}`);
      lines.push("");
      lines.push(mdEscape(item.content));
      lines.push("");
    }
  }

  if (localDemoItems.length || errorItems.length) {
    lines.push("## 技术备注");
    lines.push("");
    if (localDemoItems.length) {
      lines.push(`- 本次共有 ${localDemoItems.length} 句来自本地示例脚本。`);
    }
    if (errorItems.length) {
      lines.push(`- 本次共有 ${errorItems.length} 句 OpenClaw 生成失败。`);
    }
    lines.push("- 原始 provider 与 warning 细节保留在 JSON 导出中。");
    lines.push("");
  }

  lines.push("## 已知控制机制");
  lines.push("");
  lines.push("- 双角色按 A/B 交替发言。");
  lines.push("- 最大轮数强制限制为不超过 6。");
  lines.push("- 支持停止词和人工停止。");
  lines.push("- OpenClaw 调用异常时自动兜底，避免无限等待。");

  const blob = new Blob([`\uFEFF${lines.join("\n")}`], { type: "text/markdown;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `openclaw-dual-role-${Date.now()}.md`;
  a.click();
  URL.revokeObjectURL(url);
}

function importMaterialTo(targetId) {
  pendingImportTarget = targetId;
  els.fileImportInput.value = "";
  els.fileImportInput.click();
}

function handleFileImport(event) {
  const file = event.target.files && event.target.files[0];
  if (!file || !pendingImportTarget) return;
  const target = document.querySelector(`#${pendingImportTarget}`);
  if (!target) return;

  const maxBytes = 1024 * 1024;
  if (file.size > maxBytes) {
    alert("文件超过 1MB，请先整理成较短的摘要或文本片段。");
    return;
  }

  const reader = new FileReader();
  reader.onload = () => {
    const text = String(reader.result || "").trim();
    if (!text) {
      alert("文件内容为空，未导入。");
      return;
    }
    const block = `资料文件：${file.name}\n${text}`;
    target.value = target.value.trim() ? `${target.value.trim()}\n\n---\n${block}` : block;
    target.dispatchEvent(new Event("input", { bubbles: true }));
  };
  reader.onerror = () => alert("文件读取失败，请换成 txt、md、csv 或 json 文本文件。");
  reader.readAsText(file, "utf-8");
}

function init() {
  for (const preset of presets) {
    const option = document.createElement("option");
    option.value = preset.id;
    option.textContent = preset.label;
    els.presetSelect.appendChild(option);
  }
  loadPreset();
  checkHealth();

  els.presetSelect.addEventListener("change", () => loadPreset(els.presetSelect.value));
  els.resetBtn.addEventListener("click", () => loadPreset(els.presetSelect.value));
  els.startBtn.addEventListener("click", startDialogue);
  els.stopBtn.addEventListener("click", stopDialogue);
  els.exportBtn.addEventListener("click", exportTranscript);
  els.exportMdBtn.addEventListener("click", exportMarkdown);
  els.fileImportInput.addEventListener("change", handleFileImport);
  document.querySelectorAll("[data-import-target]").forEach(button => {
    button.addEventListener("click", () => importMaterialTo(button.dataset.importTarget));
  });
  els.maxRoundsInput.addEventListener("change", () => {
    els.maxRoundsInput.value = maxRounds();
  });
}

init();
