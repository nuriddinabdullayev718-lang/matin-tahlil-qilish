import express from "express";
import cors from "cors";
import multer from "multer";
import fs from "fs";
import path from "path";
import OpenAI from "openai";
import { fileURLToPath } from "url";

const app = express();
app.use(cors());
app.use(express.json());

// ESM uchun __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 🔹 PUBLIC papkani serve qilish
app.use(express.static(path.join(__dirname, "../public")));

// 🔹 OpenAI
const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// 🔹 File upload
const upload = multer({ dest: "uploads/" });

// 🔹 API: matn tahlil
app.post("/api/analyze", upload.single("file"), async (req, res) => {
  try {
    let text = "";

    // 📄 Fayl o‘qish
    if (req.file) {
      text = fs.readFileSync(req.file.path, "utf-8");
      fs.unlinkSync(req.file.path);
    } else if (req.body.text) {
      text = req.body.text;
    }

    if (!text || text.trim().length === 0) {
      return res.status(400).json({ error: "Matn topilmadi" });
    }

    // 🔹 MATNNI BO‘LAKLARGA AJRATISH
    const CHUNK_SIZE = 5000; // xavfsiz limit
    const chunks = [];

    for (let i = 0; i < text.length; i += CHUNK_SIZE) {
      chunks.push(text.slice(i, i + CHUNK_SIZE));
    }

    let correctedText = "";

    // 🔹 HAR BIR BO‘LAKNI AI GA YUBORAMIZ
    for (let i = 0; i < chunks.length; i++) {
      const completion = await client.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content:
              "Siz imlo va grammatik xatolarni aniqlovchi tahlilchisiz. Matnni o‘zbek tilida to‘g‘rilab qaytaring.",
          },
          {
            role: "user",
            content: chunks[i],
          },
        ],
        max_tokens: 2000,
      });

      correctedText += completion.choices[0].message.content + "\n";
    }

    // 🔹 YAKUNIY JAVOB
    res.json({
      original: text,
      corrected: correctedText,
      chunks: chunks.length,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({
      error: "Server xatosi",
      details: err.message,
    });
  }
});
