const dropzone = document.getElementById("dropzone");
const fileInput = document.getElementById("fileInput");
const fileInfo = document.getElementById("fileInfo");
const btnAnalyze = document.getElementById("btnAnalyze");
const btnAnalyzeText = document.getElementById("btnAnalyzeText");
const btnAnalyzeSpinner = document.getElementById("btnAnalyzeSpinner");

const results = document.getElementById("results");
const originalBox = document.getElementById("originalBox");
const correctedBox = document.getElementById("correctedBox");
const statusPill = document.getElementById("statusPill");

let selectedFile = null;

// === DROPZONE ===
dropzone.addEventListener("click", () => fileInput.click());

fileInput.addEventListener("change", () => {
  selectedFile = fileInput.files[0];
  if (selectedFile) {
    fileInfo.textContent = `Tanlangan fayl: ${selectedFile.name}`;
  }
});

// === ANALYZE ===
btnAnalyze.addEventListener("click", async () => {
  if (!selectedFile) {
    alert("Iltimos, fayl tanlang (DOCX yoki TXT)");
    return;
  }

  btnAnalyze.disabled = true;
  btnAnalyzeText.textContent = "Tahlil qilinmoqda...";
  btnAnalyzeSpinner.classList.remove("hidden");

  const formData = new FormData();
  // ❗ MUHIM: backend upload.single("file") kutadi
  formData.append("file", selectedFile);

  try {
    const res = await fetch("/api/analyze", {
      method: "POST",
      body: formData
    });

    if (!res.ok) {
      throw new Error("Server javob bermadi");
    }

    const data = await res.json();

    // ❗ BACKEND QAYTARADIGAN NOMLAR
    originalBox.textContent = data.originalText;
    correctedBox.innerHTML = data.correctedHtml;

    results.classList.remove("hidden");
    statusPill.textContent = "Tayyor";

  } catch (err) {
    alert("Server xatosi: " + err.message);
  } finally {
    btnAnalyze.disabled = false;
    btnAnalyzeText.textContent = "Tahlil qilish";
    btnAnalyzeSpinner.classList.add("hidden");
  }
});
