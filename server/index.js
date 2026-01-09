import express from "express";
import cors from "cors";
import multer from "multer";
import fs from "fs";
import path from "path";
import mammoth from "mammoth";
import OpenAI from "openai";
import { fileURLToPath } from "url";

const app = express();
app.use(cors());
app.use(express.json());

// ESM uchun __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Upload papka
const UPLOAD_DIR = path.join(__dirname, "uploads");
fs.mkdirSync(UPLOAD_DIR, { recursive: true });

// ✅ 10MB limit (talabingiz bo‘yicha)
const upload = multer({
  dest: UPLOAD_DIR,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
});

// ✅ OpenAI (Render ENV: OPENAI_API_KEY bo‘lishi shart)
const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// ✅ Vite build chiqqan joy: dist/ (sizda build logda dist/index.html chiqyapti)
const DIST_DIR = path.join(__dirname, "..", "dist");
app.use(express.static(DIST_DIR));

// --------- Helper: matnni bo‘laklash (token-safe) ----------
function splitIntoChunks(text, chunkSize = 5000) {
  const chunks = [];
  for (let i = 0; i < text.length; i += chunkSize) {
    chunks.push(text.slice(i, i + chunkSize));
  }
  return chunks;
}

// --------- API: Analyze ----------
app.post("/api/analyze", upload.single("file"), async (req, res) => {
  try {
    let text = "";

    // 1) DOCX/TXT o‘qish
    if (req.file) {
      const ext = path.extname(req.file.originalname).toLowerCase();

      if (ext === ".docx") {
        const result = await mammoth.extractRawText({ path: req.file.path });
        text = result.value || "";
      } else if (ext === ".txt") {
        text = fs.readFileSync(req.file.path, "utf-8");
      } else {
        fs.unlinkSync(req.file.path);
        return res.status(400).json({
          error: "Faqat .docx yoki .txt fayl yuklash mumkin (10MB gacha).",
        });
      }

      fs.unlinkSync(req.file.path);
    } else if (req.body?.text) {
      text = String(req.body.text);
    }

    if (!text || text.trim().length === 0) {
      return res.status(400).json({ error: "Matn topilmadi (bo‘sh)." });
    }

    // 2) Bo‘laklab yuborish (10MB bo‘lsa ham ishlaydi)
    const chunks = splitIntoChunks(text, 5000);
    let corrected = "";

    // 3) TPM urilmaslik uchun juda yengil “pacing”
    // (katta hujjatlarda 429 bo‘lsa, shu yordam beradi)
    const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i];

      const completion = await client.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content:
              "Siz o‘zbek tilidagi imlo va grammatik xatolarni tuzatuvchisiz. Ma’noni o‘zgartirmang. Faqat to‘g‘rilangan matnni qaytaring.",
          },
          { role: "user", content: chunk },
        ],
        max_tokens: 1500,
      });

      corrected += (completion.choices?.[0]?.message?.content || "") + "\n";

      // har bo‘lakdan keyin 300ms (TPM/429 bo‘lsa 800-1200ms qiling)
      await sleep(300);
    }

    return res.json({
      original: text,
      corrected,
      chunks: chunks.length,
    });
  } catch (err) {
    console.error("ANALYZE ERROR:", err);

    // 10MB dan katta bo‘lsa multer shu yerga tushadi
    if (String(err?.code) === "LIMIT_FILE_SIZE") {
      return res.status(413).json({
        error: "Fayl juda katta. 10MB gacha yuklang.",
      });
    }

    return res.status(500).json({
      error: "Server xatosi",
      details: err?.message || String(err),
    });
  }
});

// ✅ SPA fallback: dist/index.html (Not Found bo‘lmasin)
app.get("*", (req, res) => {
  res.sendFile(path.join(DIST_DIR, "index.html"));
});

// ✅ Render PORT
const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log("Server ishga tushdi:", PORT));
