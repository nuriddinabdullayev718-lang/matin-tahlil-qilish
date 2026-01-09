const dropzone = document.getElementById("dropzone");
const fileInput = document.getElementById("fileInput");
const fileInfo = document.getElementById("fileInfo");
const textInput = document.getElementById("textInput");

const btnAnalyze = document.getElementById("btnAnalyze");
const btnAnalyzeText = document.getElementById("btnAnalyzeText");
const btnAnalyzeSpinner = document.getElementById("btnAnalyzeSpinner");

const results = document.getElementById("results");
const originalBox = document.getElementById("originalBox");
const correctedBox = document.getElementById("correctedBox");
const statusPill = document.getElementById("statusPill");

const btnDownload = document.getElementById("btnDownload");
const btnRefresh = document.getElementById("btnRefresh");
const btnNew = document.getElementById("btnNew");
const toast = document.getElementById("toast");

let lastOriginal = "";
let lastCorrectedRaw = "";
let selectedFile = null;

function showToast(msg) {
  toast.textContent = msg;
  toast.classList.remove("hidden");
  setTimeout(() => toast.classList.add("hidden"), 2400);
}

function setLoading(on) {
  btnAnalyze.disabled = on;
  if (on) {
    btnAnalyzeText.textContent = "Tahlil qilinmoqda...";
    btnAnalyzeSpinner.classList.remove("hidden");
    statusPill.textContent = "Tahlil qilinmoqda...";
  } else {
    btnAnalyzeText.textContent = "Tahlil qilish";
    btnAnalyzeSpinner.classList.add("hidden");
  }
}

function escapeHtml(str) {
  return str
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

/**
 * Backend format:
 *  ... [xato so‘z](to‘g‘ri so‘z) ...
 * Biz shuni HTML diff ko‘rinishga o‘tkazamiz:
 *  <span class="diff"><del>xato</del><ins>to‘g‘ri</ins></span>
 */
function renderCorrectedDiff(raw) {
  // avval HTML escape
  let safe = escapeHtml(raw);

  // [wrong](right) ni diffga aylantirish
  safe = safe.replace(/\[([^\]]+)\]\(([^)]+)\)/g, (_m, wrong, right) => {
    return `<span class="diff"><del>${wrong}</del><ins>${right}</ins></span>`;
  });

  // newline -> <br> kerak emas, chunki box white-space: pre-wrap
  return safe;
}

function setFile(file) {
  selectedFile = file;

  if (!file) {
    fileInfo.textContent = "Tanlangan fayl: yo‘q";
    return;
  }

  const ext = (file.name.split(".").pop() || "").toLowerCase();
  if (!["docx", "txt"].includes(ext)) {
    selectedFile = null;
    fileInput.value = "";
    showToast("Faqat DOCX yoki TXT fayl tanlang.");
    fileInfo.textContent = "Tanlangan fayl: yo‘q";
    return;
  }

  if (file.size > 10 * 1024 * 1024) {
    selectedFile = null;
    fileInput.value = "";
    showToast("Fayl 10MB dan katta. Iltimos kichikroq fayl tanlang.");
    fileInfo.textContent = "Tanlangan fayl: yo‘q";
    return;
  }

  fileInfo.textContent = `Tanlangan fayl: ${file.name} (${Math.round(file.size / 1024)} KB)`;
  showToast("Muvaffaqiyatli yuklandi! Tahlil qilishni bosing.");
}

// Dropzone events
dropzone.addEventListener("click", () => fileInput.click());

dropzone.addEventListener("dragover", (e) => {
  e.preventDefault();
  dropzone.classList.add("dragover");
});

dropzone.addEventListener("dragleave", () => {
  dropzone.classList.remove("dragover");
});

dropzone.addEventListener("drop", (e) => {
  e.preventDefault();
  dropzone.classList.remove("dragover");
  const file = e.dataTransfer.files?.[0];
  if (file) setFile(file);
});

fileInput.addEventListener("change", () => {
  const file = fileInput.files?.[0];
  if (file) setFile(file);
});

async function analyze() {
  const typedText = (textInput.value || "").trim();

  if (!selectedFile && typedText.length < 5) {
    showToast("Fayl tanlang yoki kamida 5 ta belgidan iborat matn yozing.");
    return;
  }

  setLoading(true);
  results.classList.remove("hidden");
  statusPill.textContent = "Tahlil qilinmoqda...";

  try {
    const form = new FormData();

    if (selectedFile) {
      form.append("file", selectedFile);
    } else {
      form.append("text", typedText);
    }

    const resp = await fetch("/api/analyze", {
      method: "POST",
      body: form,
    });

    const data = await resp.json();

    if (!resp.ok) {
      const msg = data?.error || "Server xatosi";
      throw new Error(msg);
    }

    lastOriginal = data.original || "";
    lastCorrectedRaw = data.corrected || "";

    // render
    originalBox.textContent = lastOriginal;
    correctedBox.innerHTML = renderCorrectedDiff(lastCorrectedRaw);

    statusPill.textContent = "Yuklandi";
    showToast("Tahlil yakunlandi ✅");
  } catch (err) {
    console.error(err);
    statusPill.textContent = "Xato";
    showToast("Server xatosi: " + (err?.message || "Noma’lum xato"));
  } finally {
    setLoading(false);
  }
}

btnAnalyze.addEventListener("click", analyze);

btnNew.addEventListener("click", () => {
  selectedFile = null;
  fileInput.value = "";
  fileInfo.textContent = "Tanlangan fayl: yo‘q";
  textInput.value = "";
  originalBox.textContent = "";
  correctedBox.textContent = "";
  results.classList.add("hidden");
  statusPill.textContent = "Yuklanmoqda...";
  showToast("Yangi tahlilga tayyor ✅");
  window.scrollTo({ top: 0, behavior: "smooth" });
});

btnRefresh.addEventListener("click", () => {
  if (!lastOriginal && !lastCorrectedRaw) {
    showToast("Hali natija yo‘q.");
    return;
  }
  originalBox.textContent = lastOriginal;
  correctedBox.innerHTML = renderCorrectedDiff(lastCorrectedRaw);
  showToast("Yangilandi ✅");
});

btnDownload.addEventListener("click", () => {
  if (!lastCorrectedRaw) {
    showToast("Yuklab olish uchun natija yo‘q.");
    return;
  }

  // Yuklab olinadigan matn: markerlarni toza matnga aylantiramiz:
  // [xato](to‘g‘ri) => to‘g‘ri
  const clean = lastCorrectedRaw.replace(/\[([^\]]+)\]\(([^)]+)\)/g, (_m, _w, right) => right);

  const blob = new Blob([clean], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);

  const a = document.createElement("a");
  a.href = url;
  a.download = "togrillangan_matn.txt";
  document.body.appendChild(a);
  a.click();
  a.remove();

  URL.revokeObjectURL(url);
  showToast("Yuklab olindi ✅");
});
