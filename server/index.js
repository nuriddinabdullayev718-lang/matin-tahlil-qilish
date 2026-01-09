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

// FRONTEND
app.use(express.static(path.join(__dirname, "../public")));

// FILE UPLOAD
const upload = multer({ dest: "uploads/" });

// OPENAI
const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// API
app.post("/api/analyze", upload.single("file"), async (req, res) => {
  try {
    let text = "";

    if (req.file) {
      if (req.file.originalname.endsWith(".docx")) {
        const result = await mammoth.extractRawText({ path: req.file.path });
        text = result.value;
      } else {
        text = fs.readFileSync(req.file.path, "utf-8");
      }
      fs.unlinkSync(req.file.path);
    } else {
      text = req.body.text;
    }

    if (!text || text.length < 3) {
      return res.status(400).json({ error: "Matn topilmadi" });
    }

    // LIMIT → TOKEN MUAMMOSIZ
    text = text.slice(0, 12000);

    const completion = await client.chat.completions.create({
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
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server xatosi" });
  }
});

// ROOT
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "../public/index.html"));
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => {
  console.log("Server ishga tushdi:", PORT);
});
