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
app.use(express.json({ limit: "12mb" }));

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ===== OpenAI =====
const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY, // MUHIM
});

// ===== Upload =====
const upload = multer({
  dest: "uploads/",
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
});

// ===== API =====
app.post("/api/analyze", upload.single("file"), async (req, res) => {
  try {
    let text = "";

    if (req.file) {
      const ext = path.extname(req.file.originalname).toLowerCase();

      if (ext === ".txt") {
        text = fs.readFileSync(req.file.path, "utf-8");
      } else if (ext === ".docx") {
        const result = await mammoth.extractRawText({
          path: req.file.path,
        });
        text = result.value;
      }

      fs.unlinkSync(req.file.path);
    } else if (req.body.text) {
      text = req.body.text;
    }

    if (!text || text.length < 5) {
      return res.status(400).json({ error: "Matn topilmadi" });
    }

    // TOKENNI KAMAYTIRISH (MUHIM)
    text = text.slice(0, 8000);

    const completion = await client.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content:
            "Sen o‘zbek tilidagi imlo va grammatika xatolarini topib, to‘g‘rilangan variantni qaytarasan. Xato so‘zlarni [] ichiga ol, to‘g‘ri variantni () ichida ber.",
        },
        { role: "user", content: text },
      ],
      max_tokens: 2000,
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

// ===== FRONTEND =====
app.use(express.static(path.join(__dirname, "../public")));

app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "../public/index.html"));
});

// ===== START =====
const PORT = process.env.PORT || 10000;
app.listen(PORT, () => {
  console.log("Server ishga tushdi:", PORT);
});
