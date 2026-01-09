const analyzeBtn = document.getElementById("analyzeBtn");
const fileInput = document.getElementById("fileInput");
const originalBox = document.getElementById("originalText");
const correctedBox = document.getElementById("correctedText");
const errorBox = document.getElementById("errorBox");

analyzeBtn.addEventListener("click", async () => {
  errorBox.innerText = "";
  originalBox.innerText = "";
  correctedBox.innerHTML = "";

  if (!fileInput.files.length) {
    errorBox.innerText = "❌ Fayl tanlanmagan";
    return;
  }

  const formData = new FormData();
  formData.append("file", fileInput.files[0]);

  try {
    const res = await fetch("/api/analyze", {
      method: "POST",
      body: formData,
    });

    if (!res.ok) {
      const txt = await res.text();
      throw new Error(txt);
    }

    const data = await res.json();

    // ⛔ agar server bo‘sh javob qaytarsa
    if (!data || !data.original || !data.corrected) {
      throw new Error("Serverdan noto‘g‘ri javob keldi");
    }

    // ✅ Asl matn
    originalBox.innerText = data.original;

    // ✅ To‘g‘rilangan matn (HTML bilan)
    correctedBox.innerHTML = data.corrected;

  } catch (err) {
    console.error(err);
    errorBox.innerText =
      "❌ Server xatosi. Matn tahlil qilinmadi.\n" + err.message;
  }
});
