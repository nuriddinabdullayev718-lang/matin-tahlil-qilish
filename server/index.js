import mammoth from "mammoth";

app.post("/api/analyze", upload.single("file"), async (req, res) => {
  try {
    let text = "";

    // =========================
    // 📄 FILE READ (DOCX / TXT)
    // =========================
    if (req.file) {
      const ext = path.extname(req.file.originalname).toLowerCase();

      if (ext === ".docx") {
        // ✅ DOCX O‘QISH
        const result = await mammoth.extractRawText({
          path: req.file.path,
        });
        text = result.value;
      } 
      else if (ext === ".txt") {
        // ✅ TXT O‘QISH
        text = fs.readFileSync(req.file.path, "utf-8");
      } 
      else {
        fs.unlinkSync(req.file.path);
        return res.status(400).json({
          error: "Faqat DOCX yoki TXT fayl yuklash mumkin",
        });
      }

      fs.unlinkSync(req.file.path);
    } 
    else if (req.body.text) {
      text = req.body.text;
    }

    if (!text || text.trim().length === 0) {
      return res.status(400).json({ error: "Matn topilmadi" });
    }

    // =========================
    // ✂️ CHUNKING (TOKEN SAFE)
    // =========================
    const CHUNK_SIZE = 5000;
    const chunks = [];

    for (let i = 0; i < text.length; i += CHUNK_SIZE) {
      chunks.push(text.slice(i, i + CHUNK_SIZE));
    }

    let correctedText = "";

    // =========================
    // 🤖 AI ANALYSIS
    // =========================
    for (const chunk of chunks) {
      const completion = await client.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content:
              "Siz o‘zbek tilidagi imlo va grammatik xatolarni to‘g‘rilovchi tahlilchisiz.",
          },
          {
            role: "user",
            content: chunk,
          },
        ],
        max_tokens: 2000,
      });

      correctedText += completion.choices[0].message.content + "\n";
    }

    // =========================
    // ✅ RESPONSE
    // =========================
    res.json({
      original: text,
      corrected: correctedText,
      chunks: chunks.length,
    });

  } catch (err) {
    console.error("ANALYZE ERROR:", err);
    res.status(500).json({
      error: "Server xatosi",
      details: err.message,
    });
  }
});
