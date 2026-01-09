const dropzone = document.getElementById("dropzone");
const fileInput = document.getElementById("fileInput");
const textInput = document.getElementById("textInput");
const btnAnalyze = document.getElementById("btnAnalyze");
const btnAnalyzeText = document.getElementById("btnAnalyzeText");
const btnAnalyzeSpinner = document.getElementById("btnAnalyzeSpinner");
const fileInfo = document.getElementById("fileInfo");

const results = document.getElementById("results");
const originalBox = document.getElementById("originalBox");
const correctedBox = document.getElementById("correctedBox");
const statusPill = document.getElementById("statusPill");
const btnDownload = document.getElementById("btnDownload");

// ===== FILE TANLASH =====
dropzone.addEventListener("click", () => fileInput.click());

fileInput.addEventListener("change", () => {
  if (fileInput.files.length > 0) {
    fileInfo.textContent = "Tanlangan fayl: " + fileInput.files[0].name;
    textInput.value = "";
  }
});

// DRAG & DROP
dropzone.addEventListener("dragover", (e) => {
  e.preventDefault();
  dropzone.classList.add("drag");
});

dropzone.addEventListener("dragleave", () => {
  dropzone.classList.remove("drag");
});

dropzone.addEventListener("drop", (e) => {
  e.preventDefault();
  dropzone.classList.remove("drag");
  if (e.dataTransfer.files.length > 0) {
    fileInput.files = e.dataTransfer.files;
    fileInfo.textContent =
      "Tanlangan fayl: " + e.dataTransfer.files[0].name;
    textInput.value = "";
  }
});

// ===== TAHLIL =====
btnAnalyze.addEventListener("click", async () => {
  const file = fileInput.files[0];
  const text = textInput.value.trim();

  if (!file && text.length < 3) {
    alert("Fayl tanlang yoki matn kiriting!");
    return;
  }

  btnAnalyzeText.textContent = "Tahlil qilinmoqda...";
  btnAnalyzeSpinner.classList.remove("hidden");
  btnAnalyze.disabled = true;

  const formData = new FormData();
  if (file) {
    formData.append("file", file);
  } else {
    formData.append("text", text);
  }

  try {
    const res = await fetch("/api/analyze", {
      method: "POST",
      body: formData,
    });

    if (!res.ok) {
      throw new Error("Server javob bermadi");
    }

    const data = await res.json();

    originalBox.textContent = data.original;
    correctedBox.innerHTML = highlightDiff(
      data.original,
      data.corrected
    );

    results.classList.remove("hidden");
    statusPill.textContent = "Yakunlandi";
    statusPill.classList.add("pill--success");

    btnDownload.onclick = () => downloadText(data.corrected);
  } catch (err) {
    alert("Xatolik: server bilan aloqa yo‘q");
    console.error(err);
  } finally {
    btnAnalyzeText.textContent = "Tahlil qilish";
    btnAnalyzeSpinner.classList.add("hidden");
    btnAnalyze.disabled = false;
  }
});

// ===== XATOLARNI BELGILASH =====
function highlightDiff(original, corrected) {
  const o = original.split(" ");
  const c = corrected.split(" ");

  let html = "";
  for (let i = 0; i < c.length; i++) {
    if (o[i] !== c[i]) {
      html += `<span style="background:#ffe3e3;color:#c00;padding:2px 4px;border-radius:4px">${c[i]}</span> `;
    } else {
      html += c[i] + " ";
    }
  }
  return html;
}

// ===== YUKLAB OLISH =====
function downloadText(text) {
  const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "togrillangan_matn.txt";
  a.click();
  URL.revokeObjectURL(url);
}
