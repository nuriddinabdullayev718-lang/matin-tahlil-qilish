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

// === __dirname (ESM uchun TO‘G‘RI) ===
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// === FRONTEND (Vite build) SERVE ===
// MUHIM: dist papka rootda
app.use(express.static(path.join(__dirname, "../dist")));

// === OpenAI ===
const client = new OpenAI({
  apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY,
});

// === File upload ===
const upload = multer({ dest: "uploads/" });

// === API: Matn tahlil ===
app.post("/api/analyze", upload.single("file"), async (req, res) => {
  try {
    let text = "";

    if (req.file) {
      text = fs.readFileSync(req.file.path, "utf-8");
      fs.unlinkSync(req.file.path);
    } else if (req.body.text) {
      text = req.body.text;
    }

    if (!text) {
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
    console.error(err);
    res.status(500).json({ error: "Server xatosi" });
  }
});

// === SPA fallback (ENG MUHIM QATOR) ===
app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "../dist/index.html"));
});

// === PORT ===
const PORT = process.env.PORT || 10000;
app.listen(PORT, () => {
  console.log("Server ishga tushdi:", PORT);
});
