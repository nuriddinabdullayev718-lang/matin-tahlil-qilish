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
    if (!req.file) {
      return res.status(400).json({ error: "Fayl kelmadi" });
    }

    const text = req.file.buffer.toString("utf-8");

    // vaqtinchalik TEST uchun (AI ishlamasa ham frontend to‘lsin)
    const correctedHtml = text
      .replace(/olinmadi/g, "<del>olinmadi</del> <ins>olindi</ins>")
      .replace(/bajarildi/g, "<ins>bajarildi</ins>");

    res.json({
      originalText: text,
      correctedHtml: correctedHtml
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server xatosi" });
  }
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
