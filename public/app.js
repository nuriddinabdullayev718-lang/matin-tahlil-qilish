const fileInput = document.getElementById("fileInput");
const analyzeBtn = document.getElementById("analyzeBtn");
const originalText = document.getElementById("originalText");
const correctedText = document.getElementById("correctedText");
const errorBox = document.getElementById("errorBox");

analyzeBtn.addEventListener("click", async () => {
  errorBox.textContent = "";
  originalText.textContent = "";
  correctedText.innerHTML = "";

  const file = fileInput.files[0];

  if (!file) {
    errorBox.textContent = "❌ Iltimos, hujjat tanlang (DOCX yoki TXT)";
    return;
  }

  const formData = new FormData();
  // ❗ MUHIM: backend upload.single("file") kutyapti
  formData.append("file", file);

  try {
    const response = await fetch("/api/analyze", {
      method: "POST",
      body: formData,
    });

    if (!response.ok) {
      const txt = await response.text();
      throw new Error(txt);
    }

    const data = await response.json();

    // ❗ backend qaytargan nomlar
    originalText.textContent = data.originalText;
    correctedText.innerHTML = data.correctedHtml;

  } catch (err) {
    console.error(err);
    errorBox.textContent = "❌ Server xatosi: " + err.message;
  }
});
