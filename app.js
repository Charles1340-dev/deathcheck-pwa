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
  if (!loadingBox) return;

  if (isLoading) {
    loadingBox.classList.remove("hidden");

    if (checkBtn) checkBtn.disabled = true;
    if (retryBtn) retryBtn.disabled = true;
    if (shareBtn) shareBtn.disabled = true;

    if (loadingText) {
      loadingText.textContent = "AI 正在认真分析你的今日状态…";

      setTimeout(() => {
        if (!loadingBox.classList.contains("hidden") && loadingText) {
          loadingText.textContent = "正在连接服务器（首次可能较慢）…";
        }
      }, 2500);
    }
  } else {
    loadingBox.classList.add("hidden");

    if (checkBtn) checkBtn.disabled = false;
    if (retryBtn) retryBtn.disabled = !currentResult;
    if (shareBtn) shareBtn.disabled = !currentResult;
  }
}

function showError(message) {
  if (!errorBox || !errorText) return;
  errorText.textContent = message;
  errorBox.classList.remove("hidden");
}

function hideError() {
  if (!errorBox) return;
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

  if (resultTitle) resultTitle.textContent = data.title || "今日状态评估";
  if (riskSubtitle) riskSubtitle.textContent = getRiskSubtitle(data.riskLevel);

  if (probabilityValue) {
    probabilityValue.textContent = `${data.probability}%`;
    probabilityValue.className = "probability " + (data.riskLevel || "low");
  }

  if (resultReason) resultReason.textContent = sanitizeReason(data.reason);
  if (resultTips) resultTips.textContent = `建议：${data.tips || "今天尽量稳一点。"}`;
  if (resultDisclaimer) {
    resultDisclaimer.textContent =
      data.disclaimer || "仅供娱乐，不构成任何现实预测或建议。";
  }

  if (resultCard) resultCard.classList.remove("hidden");
  if (retryBtn) retryBtn.disabled = false;
  if (shareBtn) shareBtn.disabled = false;
}

async function fetchCheck() {
  hideError();
  setLoading(true);

  try {
    console.log("开始请求:", API_URL);

    const res = await fetch(API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        text: inputText ? inputText.value.trim() : ""
      })
    });

    console.log("响应状态:", res.status);

    const data = await res.json();
    console.log("响应数据:", data);

    if (!res.ok) {
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

async function shareResultAsImage() {
  if (!currentResult || !resultCard) return;

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

if (checkBtn) checkBtn.addEventListener("click", fetchCheck);

if (retryBtn) {
  retryBtn.addEventListener("click", () => {
    if (currentResult) fetchCheck();
  });
}

if (shareBtn) shareBtn.addEventListener("click", shareResultAsImage);

if (resetBtn) {
  resetBtn.addEventListener("click", () => {
    if (inputText) inputText.value = "";
    currentResult = null;
    if (resultCard) resultCard.classList.add("hidden");
    if (errorBox) errorBox.classList.add("hidden");
    if (retryBtn) retryBtn.disabled = true;
    if (shareBtn) shareBtn.disabled = true;
  });
}

if (clearInputBtn) {
  clearInputBtn.addEventListener("click", () => {
    if (inputText) inputText.value = "";
  });
}

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("./sw.js").catch(console.error);
  });
}