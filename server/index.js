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

const upload = multer({ dest: "uploads/" });

// ===== OPENAI =====
const openai = new OpenAI({
  apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY
});

// ===== API =====
app.post("/api/analyze", upload.single("file"), async (req, res) => {
  try {
    let text = "";

    if (req.file) {
      const ext = path.extname(req.file.originalname).toLowerCase();

      // ===== TXT =====
      if (ext === ".txt") {
        text = fs.readFileSync(req.file.path, "utf-8");
      }

      // ===== DOCX =====
      else if (ext === ".docx") {
        const result = await mammoth.extractRawText({
          path: req.file.path
        });
        text = result.value;
      }

      else {
        return res.status(400).json({ error: "Faqat DOCX yoki TXT fayl" });
      }

      fs.unlinkSync(req.file.path);
    }

    if (!text || text.trim().length === 0) {
      return res.status(400).json({ error: "Matn topilmadi" });
    }

    // ===== OPENAI =====
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content:
            "Imlo va grammatik xatolarni top. Xato so‘zlarni <del>qizil</del> bilan, to‘g‘ri variantni <mark>yashil</mark> bilan ko‘rsat."
        },
        { role: "user", content: text }
      ]
    });

    res.json({
      originalText: text,
      correctedHtml: completion.choices[0].message.content
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server xatosi" });
  }
});

// ===== STATIC FRONTEND =====
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

app.use(express.static(path.join(__dirname, "../public")));

app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "../public/index.html"));
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => {
  console.log("Server ishga tushdi:", PORT);
});
