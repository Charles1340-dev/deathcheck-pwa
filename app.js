const API_URL = "/api/check";

const inputText = document.getElementById("inputText");
const clearInputBtn = document.getElementById("clearInputBtn");

const loadingBox = document.getElementById("loadingBox");
const loadingText = document.getElementById("loadingText");

const errorBox = document.getElementById("errorBox");
const errorText = document.getElementById("errorText");

const supportCard = document.getElementById("supportCard");
const supportMessage = document.getElementById("supportMessage");

const resultCard = document.getElementById("resultCard");
const resultTitle = document.getElementById("resultTitle");
const riskSubtitle = document.getElementById("riskSubtitle");
const probabilityValue = document.getElementById("probabilityValue");
const resultReason = document.getElementById("resultReason");
const resultTips = document.getElementById("resultTips");
const resultDisclaimer = document.getElementById("resultDisclaimer");

const checkBtn = document.getElementById("checkBtn");
const retryBtn = document.getElementById("retryBtn");
const shareBtn = document.getElementById("shareBtn");
const resetBtn = document.getElementById("resetBtn");

let currentResult = null;
let loadingTimer = null;

function getRiskSubtitle(riskLevel) {
  if (riskLevel === "low") return "今天整体偏稳";
  if (riskLevel === "medium") return "今天需要多留个心";
  return "今天建议明显谨慎一点";
}

function setProbabilityStyle(el, riskLevel) {
  if (!el) return;
  el.classList.remove("low", "medium", "high");
  el.classList.add(riskLevel || "low");
}

function formatProbability(value) {
  const num = Number(value || 0);
  return Number.isInteger(num) ? `${num}%` : `${num.toFixed(1)}%`;
}

function startLoadingTextCycle() {
  const messages = [
    "正在识别你输入里的关键事件…",
    "正在判断哪些信息真正影响这次结果…",
    "正在生成更贴近你文本的解释…",
    "正在整理最终结果，请再等一下…"
  ];

  let index = 0;
  if (loadingText) loadingText.textContent = messages[0];

  loadingTimer = setInterval(() => {
    index = (index + 1) % messages.length;
    if (loadingText) loadingText.textContent = messages[index];
  }, 2200);
}

function stopLoadingTextCycle() {
  if (loadingTimer) {
    clearInterval(loadingTimer);
    loadingTimer = null;
  }
}

function setLoading(isLoading) {
  if (!loadingBox) return;

  if (isLoading) {
    loadingBox.classList.remove("hidden");
    if (checkBtn) checkBtn.disabled = true;
    if (retryBtn) retryBtn.disabled = true;
    if (shareBtn) shareBtn.disabled = true;
    startLoadingTextCycle();
  } else {
    loadingBox.classList.add("hidden");
    if (checkBtn) checkBtn.disabled = false;
    if (retryBtn) retryBtn.disabled = !currentResult;
    if (shareBtn) shareBtn.disabled = !currentResult;
    stopLoadingTextCycle();
  }
}

function showError(message) {
  if (!errorBox || !errorText) return;
  errorText.textContent = message || "请求失败，请稍后再试";
  errorBox.classList.remove("hidden");
}

function hideError() {
  if (!errorBox) return;
  errorBox.classList.add("hidden");
}

function hideSupport() {
  if (supportCard) supportCard.classList.add("hidden");
}

function renderSupport(text) {
  if (!supportCard || !supportMessage) return;
  if (!text || !text.trim()) {
    hideSupport();
    return;
  }
  supportMessage.textContent = text.trim();
  supportCard.classList.remove("hidden");
}

function renderResult(data) {
  currentResult = data;

  if (resultTitle) resultTitle.textContent = data.title || "今日结果";
  if (riskSubtitle) riskSubtitle.textContent = getRiskSubtitle(data.riskLevel);

  if (probabilityValue) {
    probabilityValue.textContent = formatProbability(data.probability);
    setProbabilityStyle(probabilityValue, data.riskLevel);
  }

  if (resultReason) resultReason.textContent = data.reason || "";
  if (resultTips) resultTips.textContent = `建议：${data.tips || "今天尽量稳一点。"} `;
  if (resultDisclaimer) {
    resultDisclaimer.textContent =
      data.disclaimer || "仅供娱乐，不构成任何现实预测或建议。";
  }

  renderSupport(data.supportMessage || "");

  if (resultCard) resultCard.classList.remove("hidden");
  if (retryBtn) retryBtn.disabled = false;
  if (shareBtn) shareBtn.disabled = false;
}

async function fetchCheck() {
  hideError();
  hideSupport();
  setLoading(true);

  try {
    const res = await fetch(API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        text: inputText ? inputText.value.trim() : ""
      })
    });

    const data = await res.json();

    if (!res.ok) {
      if (data.code === "DAILY_LIMIT_EXCEEDED") {
        throw new Error(data.error || "你今天的检测次数已用完。");
      }
      throw new Error(data.error || "服务器返回异常");
    }

    renderResult(data);
  } catch (err) {
    console.error("请求失败:", err);
    showError(err.message || "请求失败，请稍后再试");
  } finally {
    setLoading(false);
  }
}

async function shareCurrentResult() {
  if (!currentResult || !resultCard) return;

  const canvas = await html2canvas(resultCard, {
    backgroundColor: null,
    scale: 2
  });

  canvas.toBlob(async (blob) => {
    if (!blob) return;

    const file = new File([blob], "deathcheck-result.png", {
      type: "image/png"
    });

    if (navigator.canShare && navigator.canShare({ files: [file] })) {
      try {
        await navigator.share({
          files: [file],
          title: "DeathCheck",
          text: "我的今日风险结果"
        });
        return;
      } catch (_) {}
    }

    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = "deathcheck-result.png";
    link.click();
  });
}

if (checkBtn) checkBtn.addEventListener("click", fetchCheck);

if (retryBtn) {
  retryBtn.addEventListener("click", () => {
    fetchCheck();
  });
}

if (shareBtn) {
  shareBtn.addEventListener("click", shareCurrentResult);
}

if (resetBtn) {
  resetBtn.addEventListener("click", () => {
    if (inputText) inputText.value = "";
    currentResult = null;
    hideError();
    hideSupport();
    if (resultCard) resultCard.classList.add("hidden");
    if (retryBtn) retryBtn.disabled = true;
    if (shareBtn) shareBtn.disabled = true;
  });
}

if (clearInputBtn) {
  clearInputBtn.addEventListener("click", () => {
    if (inputText) inputText.value = "";
  });
}