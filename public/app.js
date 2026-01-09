const dropzone = document.getElementById("dropzone");
const fileInput = document.getElementById("fileInput");
const fileInput2 = document.getElementById("fileInput2");
const textInput = document.getElementById("textInput");
const analyzeBtn = document.getElementById("analyzeBtn");
const newBtn = document.getElementById("newBtn");
const fileMeta = document.getElementById("fileMeta");

const resultSection = document.getElementById("resultSection");
const originalOut = document.getElementById("originalOut");
const correctedOut = document.getElementById("correctedOut");
const toast = document.getElementById("toast");
const downloadBtn = document.getElementById("downloadBtn");

let pickedFile = null;
let lastCorrected = "";

function showToast(title, subtitle = "") {
  toast.innerHTML = `${title}${subtitle ? `<small>${subtitle}</small>` : ""}`;
  toast.classList.add("show");
  setTimeout(() => toast.classList.remove("show"), 2600);
}

function setFile(f) {
  pickedFile = f;
  if (f) {
    fileMeta.textContent = `Tanlangan fayl: ${f.name} (${Math.round(f.size / 1024)} KB)`;
    showToast("Muvaffaqiyatli yuklandi!", "Matn tahlili boshlanishi mumkin.");
  } else {
    fileMeta.textContent = "Hech qanday fayl tanlanmadi";
  }
}

function resetAll() {
  pickedFile = null;
  lastCorrected = "";
  textInput.value = "";
  originalOut.textContent = "";
  correctedOut.innerHTML = "";
  resultSection.hidden = true;
  setFile(null);
  showToast("Yangi tahlil", "Fayl tashlang yoki matn yozing.");
}

newBtn.addEventListener("click", resetAll);

dropzone.addEventListener("click", (e) => {
  // Dropzone bosilganda fayl tanlash ochilsin (matn yozish joyi bosilsa ochilmasin)
  const tag = e.target.tagName.toLowerCase();
  if (tag === "textarea" || tag === "button") return;
  fileInput.click();
});

fileInput.addEventListener("change", (e) => setFile(e.target.files[0] || null));
fileInput2.addEventListener("change", (e) => setFile(e.target.files[0] || null));

dropzone.addEventListener("dragover", (e) => {
  e.preventDefault();
  dropzone.classList.add("drag");
});
dropzone.addEventListener("dragleave", () => dropzone.classList.remove("drag"));
dropzone.addEventListener("drop", (e) => {
  e.preventDefault();
  dropzone.classList.remove("drag");
  const f = e.dataTransfer.files?.[0];
  if (f) setFile(f);
});

// Juda sodda highlight: asl va to‘g‘rilangan so‘zlarni joyma-joy solishtirib farqlarni belgilaydi
function renderDiff(original, corrected) {
  const o = (original || "").split(/\s+/);
  const c = (corrected || "").split(/\s+/);

  const max = Math.max(o.length, c.length);
  const parts = [];

  for (let i = 0; i < max; i++) {
    const ow = o[i];
    const cw = c[i];

    if (cw == null) continue;

    if (ow == null) {
      parts.push(`<mark>${escapeHtml(cw)}</mark>`);
      continue;
    }

    if (ow === cw) {
      parts.push(escapeHtml(cw));
    } else {
      // O'zgargan: eski so'zni del, yangi so'zni mark
      parts.push(`<del>${escapeHtml(ow)}</del> <mark>${escapeHtml(cw)}</mark>`);
    }
  }

  return parts.join(" ");
}

function escapeHtml(s) {
  return String(s)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

async function analyze() {
  const typed = textInput.value.trim();

  if (!pickedFile && !typed) {
    showToast("Xatolik!", "Fayl tanlang yoki matn kiriting.");
    return;
  }

  analyzeBtn.disabled = true;
  analyzeBtn.textContent = "Tahlil qilinmoqda...";

  try {
    const form = new FormData();
    if (pickedFile) form.append("file", pickedFile);
    else form.append("text", typed);

    const r = await fetch("/api/analyze", {
      method: "POST",
      body: form,
    });

    const data = await r.json();

    if (!r.ok) {
      showToast("Server xatosi!", data?.error || "Noma’lum xato");
      return;
    }

    const original = data.original || typed || "";
    const corrected = data.corrected || "";

    lastCorrected = corrected;

    originalOut.textContent = original;
    correctedOut.innerHTML = renderDiff(original, corrected);

    resultSection.hidden = false;
    showToast("Tayyor ✅", "Natija pastda chiqdi.");
    resultSection.scrollIntoView({ behavior: "smooth", block: "start" });
  } catch (e) {
    showToast("Xatolik!", "Ulanishda muammo. Keyinroq qayta urinib ko‘ring.");
  } finally {
    analyzeBtn.disabled = false;
    analyzeBtn.textContent = "Tahlil qilish";
  }
}

analyzeBtn.addEventListener("click", analyze);

downloadBtn.addEventListener("click", () => {
  if (!lastCorrected) {
    showToast("Hali natija yo‘q", "Avval tahlil qiling.");
    return;
  }
  const blob = new Blob([lastCorrected], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "togrillangan-matn.txt";
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
});

resetAll();
