import express from "express";
import cors from "cors";
import multer from "multer";
import path from "path";
import { fileURLToPath } from "url";

const app = express();
app.use(cors());

// multer memory storage
const upload = multer({
  storage: multer.memoryStorage(),
});

// __dirname aniqlash
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/* ================= API ================= */

app.post("/api/analyze", upload.single("file"), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "Fayl kelmadi" });
    }

    const text = req.file.buffer.toString("utf-8");

    // Frontend ko‘rsatishi uchun oddiy test-to‘g‘rilash
    const correctedHtml = text
      .replace(/xato/g, "<del>xato</del><ins>to‘g‘ri</ins>")
      .replace(/notogri/g, "<del>notogri</del><ins>to‘g‘ri</ins>");

    res.json({
      originalText: text,
      correctedHtml: correctedHtml,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server xatosi" });
  }
});

/* ============== FRONTEND SERVE ============== */

app.use(express.static(path.join(__dirname, "../public")));

app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "../public/index.html"));
});

/* ================= START ================= */

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => {
  console.log("Server ishga tushdi:", PORT);
});
