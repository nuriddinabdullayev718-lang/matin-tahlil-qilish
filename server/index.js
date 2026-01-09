import express from "express";
import cors from "cors";
import multer from "multer";
import mammoth from "mammoth";
import OpenAI from "openai";
import path from "path";
import { fileURLToPath } from "url";

const app = express();
app.use(cors());
app.use(express.json());

// ===== FRONTEND =====
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
app.use(express.static(path.join(__dirname, "../public")));

// ===== MULTER (XOTIRADA!) =====
const upload = multer({
  storage: multer.memoryStorage(),
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

    if (req.file) {
      const name = req.file.originalname.toLowerCase();

      if (name.endsWith(".docx")) {
        const result = await mammoth.extractRawText({
          buffer: req.file.buffer, // MUHIM
        });
        text = result.value;
      } else if (name.endsWith(".txt")) {
        text = req.file.buffer.toString("utf-8");
      } else {
        return res.status(400).json({ error: "Faqat DOCX yoki TXT" });
      }
    } else if (req.body.text) {
      text = req.body.text;
    }

    if (!text || text.trim().length < 5) {
      return res.status(400).json({ error: "Matn topilmadi" });
    }

    // token muammosiz
    text = text.slice(0, 8000);

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content:
            "Matndagi imlo va grammatik xatolarni aniqlab, to‘g‘rilangan variantni qaytar.",
        },
        { role: "user", content: text },
      ],
    });

    res.json({
      original: text,
      corrected: completion.choices[0].message.content,
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Server xatosi" });
  }
});

// ===== ROOT =====
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "../public/index.html"));
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => {
  console.log("Server ishga tushdi:", PORT);
});
