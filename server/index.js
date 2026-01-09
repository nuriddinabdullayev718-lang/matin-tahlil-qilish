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
app.use(express.json());

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// frontend build
app.use(express.static(path.join(__dirname, "../dist/public")));

// OpenAI
const client = new OpenAI({
  apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY,
});

// upload
const upload = multer({ dest: "uploads/" });

// API
app.post("/api/analyze", upload.single("file"), async (req, res) => {
  try {
    let text = "";

    if (req.file) {
      if (req.file.originalname.endsWith(".docx")) {
        const result = await mammoth.extractRawText({
          path: req.file.path,
        });
        text = result.value;
      } else {
        text = fs.readFileSync(req.file.path, "utf-8");
      }
      fs.unlinkSync(req.file.path);
    } else if (req.body.text) {
      text = req.body.text;
    }

    if (!text.trim()) {
      return res.status(400).json({ error: "Matn topilmadi" });
    }

    const completion = await client.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content:
            "Siz imlo va grammatik xatolarni aniqlovchi tahlilchisiz. Xatolarni to‘g‘rilangan variant bilan qaytaring.",
        },
        { role: "user", content: text },
      ],
    });

    res.json({
      original: text,
      corrected: completion.choices[0].message.content,
    });
  } catch (err) {
    console.error("ANALYZE ERROR:", err);
    res.status(500).json({
      error: "Server xatosi",
      detail: err.message,
    });
  }
});

// SPA
app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "../dist/public/index.html"));
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => {
  console.log("Server ishga tushdi:", PORT);
});
