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

// ===== PATH =====
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ===== FRONTEND =====
app.use(express.static(path.join(__dirname, "../public")));

// ===== FILE UPLOAD =====
const upload = multer({
  dest: "uploads/",
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
});

// ===== OPENAI =====
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// ===== API =====
app.post("/api/analyze", upload.single("file"), async (req, res) => {
  try {
    let text = "";

    // === FILE ===
    if (req.file) {
      const ext = path.extname(req.file.originalname).toLowerCase();

      if (ext === ".docx") {
        const result = await mammoth.extractRawText({
          path: req.file.path,
        });
        text = result.value;
      } else if (ext === ".txt") {
        text = fs.readFileSync(req.file.path, "utf-8");
      } else {
        return res.status(400).json({ error: "Faqat DOCX yoki TXT" });
      }

      fs.unlinkSync(req.file.path);
    }

    // === TEXTAREA ===
    else if (req.body.text) {
      text = req.body.text;
    }

    if (!text || text.trim().length < 5) {
      return res.status(400).json({ error: "Matn topilmadi" });
    }

    // 🔥 TOKENNI CHEKLASH (100% MUAMMOSIZ)
    text = text.slice(0, 8000);

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content:
            "Matndagi imlo va grammatik xatolarni top. To‘g‘rilangan matnni qaytar.",
        },
        { role: "user", content: text },
      ],
    });

    res.json({
      original: text,
      corrected: completion.choices[0].message.content,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server xatosi" });
  }
});

// ===== ROOT =====
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "../public/index.html"));
});

// ===== START =====
const PORT = process.env.PORT || 10000;
app.listen(PORT, () => {
  console.log("Server ishga tushdi:", PORT);
});
