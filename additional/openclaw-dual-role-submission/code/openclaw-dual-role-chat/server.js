const http = require("http");
const fs = require("fs");
const path = require("path");
const os = require("os");
const { execFile } = require("child_process");

const ROOT = __dirname;
const PUBLIC = path.join(ROOT, "public");
const WORK = path.join(ROOT, "work");
const PORT = Number(process.env.PORT || 5179);
const OPENCLAW_CMD =
  process.env.OPENCLAW_CMD ||
  path.join(process.env.APPDATA || "", "npm", "openclaw.cmd");
const OPENCLAW_MJS =
  process.env.OPENCLAW_MJS ||
  path.join(process.env.APPDATA || "", "npm", "node_modules", "openclaw", "openclaw.mjs");
const OPENCLAW_TURN_TIMEOUT_SECONDS = Math.max(
  5,
  Number(process.env.OPENCLAW_TURN_TIMEOUT_SECONDS || 45)
);

fs.mkdirSync(WORK, { recursive: true });

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".png": "image/png",
  ".ico": "image/x-icon",
  ".json": "application/json; charset=utf-8",
  ".md": "text/markdown; charset=utf-8"
};

function sendJson(res, status, payload) {
  res.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store"
  });
  res.end(JSON.stringify(payload));
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let body = "";
    req.setEncoding("utf8");
    req.on("data", chunk => {
      body += chunk;
      if (body.length > 1_000_000) {
        reject(new Error("请求体过大"));
        req.destroy();
      }
    });
    req.on("end", () => resolve(body));
    req.on("error", reject);
  });
}

function serveStatic(req, res) {
  const url = new URL(req.url, `http://${req.headers.host}`);
  const safePath = path.normalize(decodeURIComponent(url.pathname)).replace(/^(\.\.[/\\])+/, "");
  const filePath = path.join(PUBLIC, safePath === path.sep || safePath === "/" ? "index.html" : safePath);
  if (!filePath.startsWith(PUBLIC)) {
    res.writeHead(403);
    res.end("Forbidden");
    return;
  }

  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(404);
      res.end("Not found");
      return;
    }
    res.writeHead(200, { "Content-Type": MIME[path.extname(filePath)] || "application/octet-stream" });
    res.end(data);
  });
}

function clampMaxRounds(value) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return 6;
  return Math.max(1, Math.min(6, Math.floor(parsed)));
}

function sanitizeSessionKey(input) {
  return String(input || `dual-role-${Date.now()}`)
    .toLowerCase()
    .replace(/[^a-z0-9:_-]/g, "-")
    .slice(0, 80);
}

function buildPrompt(payload) {
  const transcript = Array.isArray(payload.transcript) ? payload.transcript : [];
  const visibleTranscript = transcript
    .slice(-10)
    .map((item, index) => `${index + 1}. ${item.roleName}: ${item.content}`)
    .join("\n");

  const stopWords = Array.isArray(payload.stopWords)
    ? payload.stopWords.filter(Boolean).join(" / ")
    : "结束 / 停止 / DONE";

  return [
    "你正在为一个课程加分题 Demo 扮演双角色自动对话中的一个角色。",
    "请严格遵守当前角色设定，不要跳出角色，不要替另一个角色发言。",
    "必须用中文回复。回复要短而具体，适合显示在聊天气泡中。",
    "",
    "当前任务主题：",
    payload.topic || "围绕一个产品方案进行有限轮次评审",
    "",
    "可用资料：",
    payload.sourceMaterial || "暂无额外资料，只能基于题目和对话上下文讨论。",
    "",
    "当前角色：",
    `身份：${payload.role?.name || "角色A"}`,
    `目标：${payload.role?.goal || "推进讨论并提出下一步"}`,
    `可用资料：${payload.role?.resources || "只使用题目、用户输入和已有对话"}`,
    `禁止事项：${payload.role?.forbidden || "不得编造事实，不得无限追问，不得脱离当前主题"}`,
    `结束条件：${payload.role?.stopCriteria || "达成结论、风险不可接受、信息不足或达到轮数上限时应收束"}`,
    "",
    "对方角色：",
    `身份：${payload.otherRole?.name || "角色B"}`,
    `目标：${payload.otherRole?.goal || "回应并补充观点"}`,
    "",
    "运行约束：",
    `当前发言序号：${payload.turnIndex || 1}`,
    `最大总发言数：${clampMaxRounds(payload.maxRounds)}`,
    `停止词：${stopWords}`,
    "",
    "已有对话：",
    visibleTranscript || "暂无，这是第一句。",
    "",
    "输出要求：只输出一个 JSON 对象，不要 Markdown，不要代码块。",
    "JSON 格式：",
    "{\"message\":\"你的角色发言，80到180字\",\"shouldStop\":false,\"stopReason\":\"如果应该停止，写停止原因；否则为空字符串\"}",
    "",
    "判断 shouldStop=true 的情况：已经形成明确结论；继续聊只会重复；触发角色结束条件；需要用户补充资料；对方已经给出停止词。"
  ].join("\n");
}

function extractTextFromOpenClaw(stdout) {
  const raw = String(stdout || "").trim();
  if (!raw) return "";
  try {
    const obj = JSON.parse(raw);
    return (
      obj?.payloads?.[0]?.text ||
      obj?.result?.payloads?.[0]?.text ||
      obj?.payload?.text ||
      obj?.result?.text ||
      obj?.text ||
      obj?.message ||
      raw
    );
  } catch {
    return raw;
  }
}

function parseRoleJson(text) {
  const cleaned = String(text || "")
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();

  try {
    return JSON.parse(cleaned);
  } catch {
    const start = cleaned.indexOf("{");
    const end = cleaned.lastIndexOf("}");
    if (start >= 0 && end > start) {
      try {
        return JSON.parse(cleaned.slice(start, end + 1));
      } catch {
        return null;
      }
    }
    return null;
  }
}

function mockTurn(payload) {
  const roleName = payload.role?.name || "角色";
  const turn = Number(payload.turnIndex || 1);
  const topic = payload.topic || "当前方案";
  const isRisk = /风险|核查|谨慎|法务|审计/.test(roleName);
  const isAdvisor = /金融顾问/.test(roleName);
  const isClient = /谨慎客户/.test(roleName);
  const isResearcher = /研究员/.test(roleName);
  const isChecker = /事实核查/.test(roleName);
  const transcript = Array.isArray(payload.transcript) ? payload.transcript : [];
  const cleanTranscript = transcript.filter(item => !item.pending);
  const source = String(payload.sourceMaterial || payload.role?.resources || "").replace(/\s+/g, " ").slice(0, 80);
  const shouldStop = turn >= clampMaxRounds(payload.maxRounds) || turn >= 6;

  const fallbackMessages = buildFallbackMessages({
    roleName,
    topic,
    source,
    isRisk,
    isAdvisor,
    isClient,
    isResearcher,
    isChecker,
    transcript: cleanTranscript
  });
  const index = Math.min(Math.floor((turn - 1) / 2), fallbackMessages.length - 1);
  const message = fallbackMessages[index];
  return {
    message,
    shouldStop,
    stopReason: shouldStop ? "达到演示轮次或已经形成可交付结论。" : "",
    provider: "local-demo-script"
  };
}

function buildFallbackMessages(context) {
  if (context.isAdvisor) {
    return [
      `基于「${context.topic}」，我先给出保守判断：短期要用的钱不适合投入高波动资产。优先目标是保本、流动性和可随时取用，而不是追求收益最大化。`,
      `如果一定要分配，我建议把核心资金留在低波动、可快速赎回的工具里；任何尝试性投资都应控制在很小比例，并且不能影响 3 个月内的生活费。`,
      `最终建议收束为：生活费不买股票或高波动基金；保留应急现金；只在不影响开销的前提下做小额学习型尝试。这个结论更匹配低风险承受能力。`
    ];
  }

  if (context.isClient) {
    return [
      `我最担心的是本金安全和 3 个月内要用钱。如果产品可能亏损、到账慢或者赎回不确定，我就不应该把生活费放进去。`,
      `我可以接受收益低一点，但不能接受临时用钱时取不出来。请把“能不能亏本金”“多久能到账”“最坏情况是什么”说清楚。`,
      `我明白了：这笔钱的第一目标是生活保障，不是投资收益。高波动资产先不碰，最多只拿不影响生活的小钱做学习。可以收束。`
    ];
  }

  if (context.isResearcher) {
    return [
      `我会把「${context.topic}」表述成课堂展示假设，而不是确定结论。证据只来自小样本观察时，结论必须保留范围限制。`,
      `我调整展示口径：先说明样本来源，再给观察发现，最后列出不能证明的部分。这样观点仍然清楚，但不会把小样本夸大成普遍事实。`,
      `最终展示可以收束为：观点、证据、限制三段式。所有没有资料支撑的数字和绝对化判断都删掉，只保留可被核查的表述。`
    ];
  }

  if (context.isChecker) {
    return [
      `我先检查证据边界：如果资料只来自课堂观察和小样本访谈，就不能使用“显著提升”“普遍适用”这类强结论。`,
      `建议把高风险表述改成“在本次观察中出现”“可能有帮助”“仍需更多样本验证”。这样不削弱展示，但能避免事实越界。`,
      `现在核查边界清楚：保留观察性结论，删掉未验证因果，标注样本限制。按这个版本可以提交展示。`
    ];
  }

  if (context.isRisk) {
    return [
      `我先把边界说清楚：这个功能最容易出问题的是隐私泄露、价格误导和纠纷责任。可以继续做 Demo，但资料里提到的「${context.source || "上线周期和用户范围"}」必须转成明确限制。`,
      `基于上一轮方案，我要求加三条闸门：不展示敏感联系方式、不替用户承诺成交价、异常交易进入人工复核。没有这些，功能不应直接上线。`,
      `现在风险边界基本清楚：只允许生成议价建议，不允许代替用户发送承诺；记录关键日志；提供一键停止和人工介入。按这个边界可以收束。`
    ];
  }

  return [
    `我建议把「${context.topic}」压成一个可演示版本：先明确目标用户、核心流程和验收标准。第一版只证明闭环，不把所有扩展能力塞进去。`,
    `我接受对方约束，调整方案：保留主流程，删掉高风险自动化；页面显示依据、边界提示和人工停止入口，验收标准改为“能完成一次受控演示”。`,
    `最终方案我收束为三件事：角色边界清楚、对话轮数受控、导出记录可审查。超出当前资料支持的内容全部列为暂缓。`
  ];
}

function callOpenClaw(prompt, payload) {
  return new Promise((resolve, reject) => {
    if (!fs.existsSync(OPENCLAW_MJS)) {
      reject(new Error(`找不到 OpenClaw 程序：${OPENCLAW_MJS}`));
      return;
    }

    const sessionKey = sanitizeSessionKey(payload.conversationId || "dual-role-demo");
    const promptPath = path.join(WORK, `${sessionKey}-${Date.now()}.prompt.txt`);
    fs.writeFileSync(promptPath, prompt, "utf8");

    const args = [
      OPENCLAW_MJS,
      "agent",
      "--agent",
      "main",
      "--session-key",
      sessionKey,
      "--message-file",
      promptPath,
      "--thinking",
      "off",
      "--timeout",
      String(OPENCLAW_TURN_TIMEOUT_SECONDS),
      "--json"
    ];

    const startedAt = Date.now();
    execFile(process.execPath, args, {
      windowsHide: true,
      timeout: (OPENCLAW_TURN_TIMEOUT_SECONDS + 4) * 1000,
      maxBuffer: 2 * 1024 * 1024,
      cwd: ROOT
    }, (error, stdout, stderr) => {
      fs.unlink(promptPath, () => {});
      if (error) {
        const timeoutText = error.killed
          ? `OpenClaw 调用超过 ${OPENCLAW_TURN_TIMEOUT_SECONDS + 4} 秒，本轮未生成。`
          : "";
        const detail = String(stderr || timeoutText || error.message || "OpenClaw 调用失败").trim();
        reject(new Error(detail.slice(0, 800)));
        return;
      }
      const text = extractTextFromOpenClaw(stdout);
      const parsed = parseRoleJson(text);
      if (!parsed || typeof parsed.message !== "string") {
        reject(new Error(`OpenClaw 返回格式不可解析：${text.slice(0, 500)}`));
        return;
      }
      resolve({
        message: parsed.message.trim(),
        shouldStop: Boolean(parsed.shouldStop),
        stopReason: String(parsed.stopReason || "").trim(),
        provider: "openclaw",
        elapsedMs: Date.now() - startedAt
      });
    });
  });
}

async function handleTurn(req, res) {
  try {
    const body = await readBody(req);
    const payload = JSON.parse(body || "{}");
    payload.maxRounds = clampMaxRounds(payload.maxRounds);

    if (!payload.role || !payload.otherRole) {
      sendJson(res, 400, { ok: false, error: "缺少角色定义" });
      return;
    }

    const useFallbackOnly = payload.provider === "fallback";
    const prompt = buildPrompt(payload);
    let result;

    if (useFallbackOnly) {
      result = mockTurn(payload);
    } else {
      try {
        result = await callOpenClaw(prompt, payload);
      } catch (error) {
        sendJson(res, 502, {
          ok: false,
          error: `OpenClaw 本轮生成失败：${error.message}`,
          recoverable: true
        });
        return;
      }
    }

    const stopWords = Array.isArray(payload.stopWords) ? payload.stopWords.filter(Boolean) : [];
    const hitStopWord = stopWords.find(word => {
      const trimmed = String(word).trim();
      if (!trimmed) return false;
      if (/^[A-Z_\[\]-]+$/.test(trimmed)) {
        return result.message.includes(trimmed);
      }
      return result.message.split(/[。！？!?；;\n]/).some(sentence => sentence.trim() === trimmed);
    });
    const maxHit = Number(payload.turnIndex || 1) >= payload.maxRounds;
    const shouldStop = Boolean(result.shouldStop || hitStopWord || maxHit);
    const stopReason = maxHit
      ? `达到最大轮数 ${payload.maxRounds}。`
      : hitStopWord
        ? `命中停止词：${hitStopWord}`
        : result.stopReason;

    sendJson(res, 200, {
      ok: true,
      data: {
        ...result,
        shouldStop,
        stopReason,
        warning: ""
      }
    });
  } catch (error) {
    sendJson(res, 500, { ok: false, error: error.message || "服务器异常" });
  }
}

function handleHealth(res) {
  sendJson(res, 200, {
    ok: true,
    openclawCmd: OPENCLAW_CMD,
    openclawRuntime: OPENCLAW_MJS,
    openclawFound: fs.existsSync(OPENCLAW_MJS),
    turnTimeoutSeconds: OPENCLAW_TURN_TIMEOUT_SECONDS,
    platform: `${os.platform()} ${os.release()}`,
    maxRoundsPolicy: "<= 6"
  });
}

const server = http.createServer((req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);
  if (req.method === "GET" && url.pathname === "/api/health") {
    handleHealth(res);
    return;
  }
  if (req.method === "POST" && url.pathname === "/api/turn") {
    handleTurn(req, res);
    return;
  }
  if (req.method === "GET") {
    serveStatic(req, res);
    return;
  }
  res.writeHead(405);
  res.end("Method not allowed");
});

server.listen(PORT, () => {
  console.log(`OpenClaw Dual Role Chat running at http://127.0.0.1:${PORT}`);
});
