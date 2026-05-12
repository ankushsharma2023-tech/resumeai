const express = require("express");
const multer = require("multer");
const { GoogleGenerativeAI } = require("@google/generative-ai");
const path = require("path");

const app = express();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });

app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

const PROMPT = `You are an expert resume reviewer. Analyze the resume and return ONLY a valid JSON object — no markdown, no backticks, no explanation, just raw JSON.

The JSON must have exactly these keys:
{
  "score": <integer 0-100, overall resume quality>,
  "summary": "<2-3 sentence overview of the candidate>",
  "strengths": ["<strength>", ...],
  "improvements": ["<area to improve>", ...],
  "skills": ["<skill>", ...],
  "keywords": ["<keyword>", ...],
  "experience": [{"role": "...", "company": "...", "duration": "...", "highlights": "..."}],
  "education": [{"degree": "...", "institution": "...", "year": "..."}],
  "ats_score": <integer 0-100, ATS compatibility>,
  "ats_notes": "<notes on ATS friendliness>",
  "suggestions": ["<actionable suggestion>", ...]
}

Be specific and detailed. Base every point on the actual resume content.`;

app.post("/api/analyze", upload.single("resume"), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: "No file uploaded." });

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) return res.status(500).json({ error: "GEMINI_API_KEY is not set on the server." });

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

    const file = req.file;
    const isPDF = file.mimetype === "application/pdf" || file.originalname.toLowerCase().endsWith(".pdf");

    let result;

    if (isPDF) {
      const base64Data = file.buffer.toString("base64");
      result = await model.generateContent([
        { inlineData: { mimeType: "application/pdf", data: base64Data } },
        PROMPT
      ]);
    } else {
      // TXT / DOC fallback
      const text = file.buffer.toString("utf-8");
      result = await model.generateContent(`${PROMPT}\n\nRESUME CONTENT:\n${text}`);
    }

    const raw = result.response.text();
    const clean = raw.replace(/```json|```/g, "").trim();
    const data = JSON.parse(clean);
    res.json(data);

  } catch (err) {
    console.error("Analysis error:", err.message);
    res.status(500).json({ error: err.message || "Analysis failed. Please try again." });
  }
});

app.get("/{*path}", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`✅ ResumeAI running at http://localhost:${PORT}`));
