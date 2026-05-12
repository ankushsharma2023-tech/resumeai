const express = require("express");
const multer = require("multer");
const Groq = require("groq-sdk");
const pdfParse = require("pdf-parse");
const path = require("path");

const app = express();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024
  }
});

app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

const PROMPT = `
You are an expert resume reviewer.

Analyze the resume carefully and return ONLY a valid JSON object.

Return ONLY valid JSON.
No markdown.
No comments.
No explanation.
No extra text before or after JSON.

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

    const isPDF =
      file.mimetype === "application/pdf" ||
      file.originalname.toLowerCase().endsWith(".pdf");

    if (isPDF) {
      const pdfData = await pdfParse(file.buffer);
      resumeText = pdfData.text;
    } else {
      resumeText = file.buffer.toString("utf-8");
    }

    if (!resumeText || resumeText.trim().length === 0) {
      return res.status(400).json({
        error: "Could not extract text from resume"
      });
    }

    // Prevent token overflow
    resumeText = resumeText.slice(0, 12000);

    const completion = await groq.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      temperature: 0.2,
      messages: [
        {
          role: "system",
          content: PROMPT
        },
        {
          role: "user",
          content: `Resume Content:\n\n${resumeText}`
        }
      ]
    });

    const raw = completion.choices[0].message.content;

    // Extract JSON safely
    const start = raw.indexOf("{");
    const end = raw.lastIndexOf("}");

    if (start === -1 || end === -1) {
      return res.status(500).json({
        error: "No JSON found in AI response",
        raw
      });
    }

    const jsonString = raw.slice(start, end + 1);

    let data;

    try {
      data = JSON.parse(jsonString);
    } catch (jsonError) {
      console.error("Invalid JSON:", jsonString);

      return res.status(500).json({
        error: "AI returned invalid JSON",
        raw: jsonString
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