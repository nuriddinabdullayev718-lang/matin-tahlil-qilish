import express from "express";
import cors from "cors";
import multer from "multer";
import mammoth from "mammoth";
import OpenAI from "openai";
import path from "path";
import { fileURLToPath } from "url";

// DOCX export uchun
import { Document, Packer, Paragraph, TextRun } from "docx";

const app = express();
app.use(cors());
app.use(express.json({ limit: "15mb" }));

// ===== FRONTEND =====
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Render/Vite build bo'lsa dist serve qilish
app.use(express.static(path.join(__dirname, "../dist")));
app.use(express.static(path.join(__dirname, "../public")));

// ===== MULTER (XOTIRADA) =====
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
});

// ===== OPENAI =====
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// ---------- helpers ----------
function getExt(name = "") {
  const n = name.toLowerCase();
  if (n.endsWith(".docx")) return "docx";
  if (n.endsWith(".txt")) return "txt";
  return "txt";
}

// Matnni bo'laklash (truncation o'rniga)
function chunkText(text, maxLen = 4500) {
  const parts = text.split(/\n{2,}/g);
  const chunks = [];
  let buf = "";

  for (const p of parts) {
    const next = (buf ? buf + "\n\n" : "") + p;
    if (next.length > maxLen) {
      if (buf) chunks.push(buf);
      // juda katta paragraf bo'lsa, kesib bo'laklaymiz
      if (p.length > maxLen) {
        for (let i = 0; i < p.length; i += maxLen) {
          chunks.push(p.slice(i, i + maxLen));
        }
        buf = "";
      } else {
        buf = p;
      }
    } else {
      buf = next;
    }
  }
  if (buf) chunks.push(buf);
  return chunks;
}

function escapeRegExp(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// konservativ replace: faqat topilganda
function applyCorrections(original, corrections) {
  let out = original;

  for (const c of corrections) {
    const wrong = (c?.wrong || "").trim();
    const correct = (c?.correct || "").trim();
    if (!wrong || !correct || wrong === correct) continue;

    // agar wrong faqat harflardan iborat bo'lsa, word-boundary bilan
    const isWord = /^[\p{L}’'`-]+$/u.test(wrong);
    const pattern = isWord
      ? new RegExp(`\\b${escapeRegExp(wrong)}\\b`, "g")
      : new RegExp(escapeRegExp(wrong), "g");

    // faqat bor bo'lsa almashtiramiz
    if (pattern.test(out)) {
      out = out.replace(pattern, correct);
    }
  }

  return out;
}

async function detectCorrections(chunk) {
  // Detect-only: faqat JSON corrections qaytarsin (rewrite yo'q)
  const completion = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    temperature: 0.1,
    messages: [
      {
        role: "system",
        content:
          "Siz o'zbek matnidagi imlo/grammatika/uslub xatolarini topasiz. Matnni qayta yozmang. Faqat JSON qaytaring: " +
          '{"corrections":[{"wrong":"...","correct":"...","type":"imlo|grammatika|uslub","reason":"qisqa sabab"}]}. ' +
          "Agar xato bo'lmasa corrections bo'sh массив bo'lsin. Hech qanday qo'shimcha matn yozmang.",
      },
      { role: "user", content: chunk },
    ],
  });

  const raw = completion.choices?.[0]?.message?.content || "";
  try {
    const parsed = JSON.parse(raw);
    const corr = Array.isArray(parsed?.corrections) ? parsed.corrections : [];
    return corr;
  } catch {
    // JSON kelmasa — xatosiz deb qabul qilamiz (server yiqilmasin)
    return [];
  }
}

// ===== API: ANALYZE =====
app.post("/api/analyze", upload.single("file"), async (req, res) => {
  try {
    let text = "";
    let inputExt = "txt";
    let filename = "matn";

    if (req.file) {
      filename = req.file.originalname || "matn";
      inputExt = getExt(filename);

      if (inputExt === "docx") {
        const result = await mammoth.extractRawText({ buffer: req.file.buffer });
        text = result.value || "";
      } else if (inputExt === "txt") {
        text = req.file.buffer.toString("utf-8");
      } else {
        return res.status(400).json({ error: "Faqat DOCX yoki TXT" });
      }
    } else if (req.body.text) {
      text = String(req.body.text);
      inputExt = "txt";
      filename = "matn.txt";
    }

    if (!text || text.trim().length < 5) {
      return res.status(400).json({ error: "Matn topilmadi" });
    }

    // Truncation yo'q, chunking bor
    const chunks = chunkText(text, 4500);

    let allCorrections = [];
    for (const ch of chunks) {
      const corr = await detectCorrections(ch);
      allCorrections = allCorrections.concat(corr);
    }

    const corrected = applyCorrections(text, allCorrections);

    res.json({
      original: text,
      corrected,
      inputExt,   // export uchun
      filename,   // export uchun
      corrections: allCorrections, // ixtiyoriy (keyin list ko'rsatish uchun)
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Server xatosi" });
  }
});

// ===== API: EXPORT (DOCX yoki TXT) =====
// Frontend "runs" yuboradi: [{text, kind:'same'|'removed'|'added'}]
app.post("/api/export", async (req, res) => {
  try {
    const { runs, inputExt, baseName } = req.body || {};
    const ext = inputExt === "docx" ? "docx" : "txt";
    const name = (baseName || "tahlil-natija").replace(/\.[^/.]+$/, "");

    if (!Array.isArray(runs) || runs.length === 0) {
      return res.status(400).json({ error: "Export uchun runs topilmadi" });
    }

    if (ext === "txt") {
      // TXT: ~~wrong~~ [correct] format
      const out = runs
        .map((r) => {
          if (r.kind === "removed") return `~~${r.text}~~`;
          if (r.kind === "added") return `[${r.text}]`;
          return r.text;
        })
        .join("");

      res.setHeader("Content-Type", "text/plain; charset=utf-8");
      res.setHeader("Content-Disposition", `attachment; filename="${name}.txt"`);
      return res.send(out);
    }

    // DOCX export
    const paragraph = new Paragraph({
      children: runs.map((r) => {
        const t = String(r.text || "");
        if (r.kind === "removed") {
          return new TextRun({
            text: t,
            strike: true,
            color: "C1121F", // qizilga yaqin
          });
        }
        if (r.kind === "added") {
          return new TextRun({
            text: t,
            bold: true,
            color: "2D6A4F", // yashilga yaqin
          });
        }
        return new TextRun({ text: t });
      }),
    });

    const doc = new Document({
      sections: [{ children: [paragraph] }],
    });

    const buf = await Packer.toBuffer(doc);

    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
    );
    res.setHeader("Content-Disposition", `attachment; filename="${name}.docx"`);
    return res.send(buf);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Export xatosi" });
  }
});

// ===== ROOT =====
app.get("*", (req, res) => {
  // dist bo'lsa shu chiqadi (Render builddan keyin)
  const distIndex = path.join(__dirname, "../dist/index.html");
  const pubIndex = path.join(__dirname, "../public/index.html");
  res.sendFile(distIndex, (err) => {
    if (err) res.sendFile(pubIndex);
  });
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log("Server ishga tushdi:", PORT));
