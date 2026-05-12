const express = require("express");
const multer = require("multer");
const Groq = require("groq-sdk");
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

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY
});

app.post("/api/analyze", upload.single("resume"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        error: "No file uploaded"
      });
    }

    if (!process.env.GROQ_API_KEY) {
      return res.status(500).json({
        error: "GROQ_API_KEY missing"
      });
    }

    const file = req.file;

    let resumeText = "";

    if (
      file.mimetype === "application/pdf" ||
      file.originalname.toLowerCase().endsWith(".pdf")
    ) {
      resumeText = file.buffer.toString("utf-8");
    } else {
      resumeText = file.buffer.toString("utf-8");
    }

    const completion = await groq.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      temperature: 0.3,
      messages: [
        {
          role: "user",
          content: `
${PROMPT}

RESUME CONTENT:
${resumeText}
`
        }
      ]
    });

    const raw = completion.choices[0].message.content;

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

app.use((req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`✅ ResumeAI running on port ${PORT}`);
});