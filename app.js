const API_URL = "https://deathcheck-backend.onrender.com/api/check";

const inputText = document.getElementById("inputText");
const clearInputBtn = document.getElementById("clearInputBtn");

const loadingBox = document.getElementById("loadingBox");
const loadingText = document.getElementById("loadingText");

const errorBox = document.getElementById("errorBox");
const errorText = document.getElementById("errorText");

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

function setLoading(isLoading) {
  if (isLoading) {
    loadingBox.classList.remove("hidden");
    checkBtn.disabled = true;
    retryBtn.disabled = true;
    shareBtn.disabled = true;
    loadingText.textContent = "AI 正在认真分析你的今日状态…";

    setTimeout(() => {
      if (!loadingBox.classList.contains("hidden")) {
        loadingText.textContent = "正在连接服务器（首次可能较慢）…";
      }
    }, 2500);
  } else {
    loadingBox.classList.add("hidden");
    checkBtn.disabled = false;
    retryBtn.disabled = !currentResult;
    shareBtn.disabled = !currentResult;
  }
}

function showError(message) {
  errorText.textContent = message;
  errorBox.classList.remove("hidden");
}

function hideError() {
  errorBox.classList.add("hidden");
}

function getRiskSubtitle(riskLevel) {
  if (riskLevel === "low") return "今天整体偏稳";
  if (riskLevel === "medium") return "今天稍微收着点";
  return "今天建议谨慎一点";
}

function sanitizeReason(text) {
  const badPhrases = [
    "用户没有提供",
    "按普通平静的一天分析",
    "根据用户输入",
    "根据你的输入",
    "普通平静的一天",
    "分析如下"
  ];

  for (const phrase of badPhrases) {
    if ((text || "").includes(phrase)) {
      return "今天整体像普通模式，风险不高，但也别边走路边发呆。";
    }
  }
  return text || "";
}

function renderResult(data) {
  currentResult = data;

  resultTitle.textContent = data.title || "今日状态评估";
  riskSubtitle.textContent = getRiskSubtitle(data.riskLevel);

  probabilityValue.textContent = `${data.probability}%`;
  probabilityValue.className = "probability " + (data.riskLevel || "low");

  resultReason.textContent = sanitizeReason(data.reason);
  resultTips.textContent = `建议：${data.tips || "今天尽量稳一点。"}`;
  resultDisclaimer.textContent =
    data.disclaimer || "仅供娱乐，不构成任何现实预测或建议。";

  resultCard.classList.remove("hidden");
  retryBtn.disabled = false;
  shareBtn.disabled = false;
}

async function fetchCheck() {
  hideError();
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
      throw new Error(data.error || "服务器返回异常");
    }

    renderResult(data);
  } catch (err) {
    showError(err.message || "请求失败，请稍后再试");
  } finally {
    setLoading(false);
  }
}

async function shareResultAsImage() {
  if (!currentResult) return;

  const canvas = await html2canvas(resultCard, {
    backgroundColor: null,
    scale: 2
  });

  canvas.toBlob(async (blob) => {
    if (!blob) return;

    const file = new File([blob], "deathcheck-result.png", { type: "image/png" });

    if (navigator.canShare && navigator.canShare({ files: [file] })) {
      try {
        await navigator.share({
          files: [file],
          title: "DeathCheck",
          text: "我的今日状态评估结果"
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

checkBtn.addEventListener("click", fetchCheck);

retryBtn.addEventListener("click", () => {
  if (currentResult) fetchCheck();
});

shareBtn.addEventListener("click", shareResultAsImage);

resetBtn.addEventListener("click", () => {
  inputText.value = "";
  currentResult = null;
  resultCard.classList.add("hidden");
  errorBox.classList.add("hidden");
  retryBtn.disabled = true;
  shareBtn.disabled = true;
});

clearInputBtn.addEventListener("click", () => {
  inputText.value = "";
});

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("./sw.js").catch(console.error);
  });
}