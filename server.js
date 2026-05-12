const express = require("express");
const multer = require("multer");
const { GoogleGenerativeAI } = require("@google/generative-ai");
const path = require("path");

const app = express();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }
});

app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

const PROMPT = `
You are an expert resume reviewer.

Analyze the resume and return ONLY a valid JSON object.

Do not use markdown.
Do not use backticks.
Do not explain anything.

Return JSON in this exact format:

{
  "score": 0,
  "summary": "",
  "strengths": [],
  "improvements": [],
  "skills": [],
  "keywords": [],
  "experience": [
    {
      "role": "",
      "company": "",
      "duration": "",
      "highlights": ""
    }
  ],
  "education": [
    {
      "degree": "",
      "institution": "",
      "year": ""
    }
  ],
  "ats_score": 0,
  "ats_notes": "",
  "suggestions": []
}

Be detailed and accurate based on the resume provided.
`;

app.post("/api/analyze", upload.single("resume"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        error: "No file uploaded"
      });
    }

    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
      return res.status(500).json({
        error: "GEMINI_API_KEY missing"
      });
    }

    const genAI = new GoogleGenerativeAI(apiKey);

    const model = genAI.getGenerativeModel({
      model: "gemini-2.0-flash"
    });

    const file = req.file;

    const isPDF =
      file.mimetype === "application/pdf" ||
      file.originalname.toLowerCase().endsWith(".pdf");

    let result;

    if (isPDF) {
      const base64Data = file.buffer.toString("base64");

      result = await model.generateContent([
        {
          inlineData: {
            mimeType: "application/pdf",
            data: base64Data
          }
        },
        PROMPT
      ]);
    } else {
      const text = file.buffer.toString("utf-8");

      result = await model.generateContent(`
${PROMPT}

RESUME CONTENT:
${text}
`);
    }

    const raw = result.response.text();

    const clean = raw
      .replace(/```json/g, "")
      .replace(/```/g, "")
      .trim();

    let data;

    try {
      data = JSON.parse(clean);
    } catch (jsonError) {
      console.error("Invalid JSON:", clean);

      return res.status(500).json({
        error: "AI returned invalid JSON",
        raw: clean
      });
    }

    res.json(data);

  } catch (err) {
    console.error("Analysis error:", err);

    res.status(500).json({
      error: err.message || "Analysis failed"
    });
  }
});

app.use( (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`✅ ResumeAI running on port ${PORT}`);
});