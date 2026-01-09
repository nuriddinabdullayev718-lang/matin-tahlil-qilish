import express from "express";
import cors from "cors";
import multer from "multer";
import fs from "fs";
import mammoth from "mammoth";
import OpenAI from "openai";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);


const app = express();
app.use(cors());
// 🔥 FRONTEND STATIC FILES
app.use(express.static(path.join(__dirname, "../public")));

app.use(express.json());

const upload = multer({ limits: { fileSize: 10 * 1024 * 1024 } }); // 10MB

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

app.post("/api/analyze", upload.single("file"), async (req, res) => {
  try {
    let text = "";

    // ✅ DOCX
    if (req.file && req.file.originalname.endsWith(".docx")) {
      const result = await mammoth.extractRawText({
        buffer: fs.readFileSync(req.file.path),
      });
      text = result.value;
    }

    // ✅ TXT
    else if (req.file && req.file.originalname.endsWith(".txt")) {
      text = fs.readFileSync(req.file.path, "utf-8");
    }

    // ✅ TEXTAREA
    else if (req.body.text) {
      text = req.body.text;
    }

    if (!text || text.length < 5) {
      return res.status(400).json({ error: "Matn topilmadi" });
    }

    // 🔥 TOKENNI CHEKLASH
    text = text.slice(0, 8000);

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

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => {
  console.log("Server ishga tushdi:", PORT);
});
// 🔥 ROOT ROUTE
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "../public/index.html"));
});

