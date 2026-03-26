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
  if (riskLevel === "medium") return "今天建议谨慎一点";
  return "今天要多留神";
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
    "正在整理你今天这点情况…",
    "正在把话说得更像人一点…",
    "正在想一个不那么像机器的说法…",
    "马上就好，再等一下…"
  ];

  let index = 0;
  loadingText.textContent = messages[0];

  loadingTimer = setInterval(() => {
    index = (index + 1) % messages.length;
    loadingText.textContent = messages[index];
  }, 1800);
}

function stopLoadingTextCycle() {
  if (loadingTimer) {
    clearInterval(loadingTimer);
    loadingTimer = null;
  }
}

function setLoading(isLoading) {
  if (isLoading) {
    loadingBox.classList.remove("hidden");
    checkBtn.disabled = true;
    retryBtn.disabled = true;
    shareBtn.disabled = true;
    startLoadingTextCycle();
  } else {
    loadingBox.classList.add("hidden");
    checkBtn.disabled = false;
    retryBtn.disabled = !currentResult;
    shareBtn.disabled = !currentResult;
    stopLoadingTextCycle();
  }
}

function showError(message) {
  errorText.textContent = message || "请求失败，请稍后再试";
  errorBox.classList.remove("hidden");
}

function hideError() {
  errorBox.classList.add("hidden");
}

function hideSupport() {
  supportCard.classList.add("hidden");
}

function renderSupport(text) {
  if (!text || !text.trim()) {
    hideSupport();
    return;
  }
  supportMessage.textContent = text.trim();
  supportCard.classList.remove("hidden");
}

function renderResult(data) {
  currentResult = data;

  resultTitle.textContent = data.title || "今天偏稳";
  riskSubtitle.textContent = getRiskSubtitle(data.riskLevel);

  probabilityValue.textContent = formatProbability(data.probability);
  setProbabilityStyle(probabilityValue, data.riskLevel);

  resultReason.textContent = data.reason || "";
  resultTips.textContent = `建议：${data.tips || "今天稳一点就好。"} `;
  resultDisclaimer.textContent =
    data.disclaimer || "仅供娱乐，不构成任何现实预测或建议。";

  renderSupport(data.supportMessage || "");
  resultCard.classList.remove("hidden");
  retryBtn.disabled = false;
  shareBtn.disabled = false;
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
        text: inputText.value.trim()
      })
    });

    const data = await res.json();

    if (!res.ok) {
      if (data.code === "DAILY_LIMIT_EXCEEDED") {
        throw new Error(data.error || "你今天的检测次数已经用完了。");
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
          text: "我的今日结果"
        });
        return;
      } catch (e) {}
    }

    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = "deathcheck-result.png";
    link.click();
  });
}

checkBtn.addEventListener("click", fetchCheck);

retryBtn.addEventListener("click", () => {
  fetchCheck();
});

shareBtn.addEventListener("click", shareCurrentResult);

resetBtn.addEventListener("click", () => {
  inputText.value = "";
  currentResult = null;
  hideError();
  hideSupport();
  resultCard.classList.add("hidden");
  retryBtn.disabled = true;
  shareBtn.disabled = true;
});

clearInputBtn.addEventListener("click", () => {
  inputText.value = "";
});