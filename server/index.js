import express from "express";
import cors from "cors";
import multer from "multer";
import fs from "fs";
import path from "path";
import OpenAI from "openai";
import mammoth from "mammoth";
import { fileURLToPath } from "url";

const app = express();
app.use(cors());
app.use(express.json({ limit: "2mb" }));

// __dirname (ESM)
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Static frontend: /public
const PUBLIC_DIR = path.join(__dirname, "..", "public");
app.use(express.static(PUBLIC_DIR));

// OpenAI
const client = new OpenAI({
  apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY,
});

// Upload
const upload = multer({ dest: path.join(__dirname, "..", "uploads") });

// Fayldan matn olish (txt/docx)
async function extractTextFromFile(file) {
  const ext = (path.extname(file.originalname || "").toLowerCase() || "").trim();

  if (ext === ".txt") {
    return fs.readFileSync(file.path, "utf-8");
  }

  if (ext === ".docx") {
    const result = await mammoth.extractRawText({ path: file.path });
    return (result.value || "").trim();
  }

  return "";
}

// API
app.post("/api/analyze", upload.single("file"), async (req, res) => {
  try {
    let text = "";

    if (req.file) {
      text = await extractTextFromFile(req.file);
      fs.unlinkSync(req.file.path);
    } else if (req.body?.text) {
      text = String(req.body.text);
    }

    if (!text || !text.trim()) {
      return res.status(400).json({ error: "Matn topilmadi (fayl TXT/DOCX bo‘lsin)" });
    }

    const completion = await client.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content:
            "Siz imlo va grammatik xatolarni aniqlovchi tahlilchisiz. Matnni to‘g‘rilab, faqat to‘g‘rilangan matnni qaytaring.",
        },
        { role: "user", content: text },
      ],
    });

    res.json({
      original: text,
      corrected: completion.choices?.[0]?.message?.content || "",
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server xatosi" });
  }
});

// SPA fallback: hamma yo‘lni index.html ga qaytaradi
app.get("*", (req, res) => {
  res.sendFile(path.join(PUBLIC_DIR, "index.html"));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log("Server ishga tushdi:", PORT));
