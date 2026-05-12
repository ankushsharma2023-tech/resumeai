# ResumeAI – AI Resume Analyzer (Free with Google Gemini)

A beautiful resume analyzer powered by Google Gemini AI — **completely free**, no credit card needed.

---

## Step 1 – Get your FREE Gemini API Key (2 minutes)

1. Go to **https://aistudio.google.com**
2. Sign in with your Google account
3. Click **"Get API Key"** → **"Create API key"**
4. Copy the key (starts with `AIza...`)

---

## Step 2 – Run Locally

```bash
# Install dependencies
npm install

# Set your API key and start
# Mac / Linux:
GEMINI_API_KEY=AIza... npm start

# Windows CMD:
set GEMINI_API_KEY=AIza...
npm start

# Windows PowerShell:
$env:GEMINI_API_KEY="AIza..."
npm start
```

Open **http://localhost:3000** in your browser.

### Using a .env file (easier)
Create a file named `.env` in this folder:
```
GEMINI_API_KEY=AIza...
```
Then install dotenv and add one line to server.js:
```bash
npm install dotenv
```
Add at the very top of server.js:
```js
require('dotenv').config();
```
Now just run `npm start`.

---

## Step 3 – Deploy Online FREE on Render

1. Push this folder to a **GitHub repo**
   - Go to github.com → New Repository → upload all files
2. Go to **https://render.com** → Sign up free
3. Click **New** → **Web Service** → Connect your GitHub repo
4. Fill in:
   - **Build Command:** `npm install`
   - **Start Command:** `npm start`
   - **Environment:** Node
5. Click **Environment Variables** → Add:
   - Key: `GEMINI_API_KEY`
   - Value: `AIza...` (your key)
6. Click **Create Web Service**
7. Wait ~2 minutes → Your site is live at `https://your-app.onrender.com` 🎉

---

## Deploy on Railway (Alternative)

1. Go to **https://railway.app** → New Project → Deploy from GitHub
2. Add variable: `GEMINI_API_KEY` = your key
3. Done — Railway auto-detects Node.js

---

## Project Structure

```
resumeai-gemini/
├── server.js          ← Node/Express backend
├── public/
│   └── index.html     ← Frontend UI
├── package.json
├── .gitignore
└── README.md
```
