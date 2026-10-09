# ⚡ TECH VORTEX
### AI-Driven Career Intelligence & Employment Management Platform

> **Hackathon Team**: Tech Vortex  
> **Topic**: AI DRIVEN CAREER INTELLIGENCE AND EMPLOYMENT MANAGEMENT PLATFORM  
> **Tech Stack**: React 18 (root `index.html`, loaded through browser UMD scripts), Node.js & Express (REST API), Python (TF-IDF/cosine career matcher), JSON file persistence.

---

## 🌟 Executive Summary & Problem Statement

The project is designed around common career-preparation needs for students and freshers:
1. **Profile presentation**: Organize skills, education, interests, and project evidence in one place.
2. **Skill planning**: Compare a candidate profile with a small local role ontology and explain the resulting gaps.
3. **Planning and focus**: Build a gap-based learning plan and use the included focus tools.

The project does not connect to Gemini, ChatGPT, Claude, LinkedIn ranking, recruiter systems, or hiring services.

---

## 🧬 The 5-Stage AI/ML Career Intelligence Pipeline

```
Candidate profile
        ↓
Canonical skill normalization and TF-IDF role-text comparison
        ↓
Weighted skill coverage, project evidence, education and interest components
        ↓
Ranked similarity indicators against the local career ontology
        ↓
Explainable skill gaps and a dependency-ordered learning roadmap
```

### Pipeline Breakdown:
1. **Student Information Ingestion**: Uses candidate profile fields (Name, Email, Phone, Address, College, Degree, CGPA, Skills, Career Interests, Target CTC).
2. **AI/ML Feature Vectorization**: Applies canonical skill normalization and TF-IDF weighting to candidate and career requirement text.
3. **Skills + Interests + Education Alignment**: Computes explicit weighted components from role skill coverage, supplied project evidence, education fields, and interests. Market statistics do not affect career ranking.
4. **Career Recommendation Synthesis**: Uses TF-IDF cosine similarity and explicit skill, project, education, and interest components against a small local career ontology. The resulting match score is an explainable similarity indicator, not an employment probability.
5. **Actionable Delivery**: Returns ranked career tracks, explainable skill gaps, and a profile-specific learning roadmap. The bundled job cards are example opportunities; no application is submitted.

---

## 🚀 Key Modules & Hackathon Feature Matrix

| Module | Feature Set | Hackathon Impact |
|---|---|---|
| **⚡ Dashboard** | Backend career recommendations, weighted match breakdown, skill explanations, sample opportunity cards, animated cyber canvas | Displays the Python analysis response and clearly labeled local demo content. |
| **👤 Student Profile Vault** | Candidate profiling, backend-powered suggestions, quick location chips, and learning links | Saves profile data locally and optionally syncs it with the Node backend. |
| **🔍 Skill Gap Detection (NEW)** | Resume upload (PDF, DOCX, TXT), rule-based skill extraction with text evidence, target career selector, gap matrix, and personalized roadmap | Shows ontology-based gaps, generated project milestones, and verification criteria; it does not source internships. |
| **💼 LinkedIn Recruiter Magnet** | Profile walkthrough preview, headline and summary templates, 8-point local checklist | Provides static writing guidance; it does not call an external AI or LinkedIn ranking service. |
| **📈 Market Analytics & YouTube** | Sample market indicators, external reference links, and curated channel cards | Market figures and opportunity cards are bundled demo data with no external refresh or verification. |
| **⏱️ Focus & Stress Studio (Last Slot)** | 25m/5m Pomodoro, synthesized ambient sounds, 4-7-8 breathing timer, plus memory and reaction games | Provides focus and relaxation exercises; it does not measure health outcomes. |

---

## 💻 Tech Stack & Architecture

- **Frontend**: **React 18** + **Tailwind CSS** + **Web Audio API** + browser-supported **Web Speech API** + **Canvas Confetti**. Several frontend assets and runtime scripts are loaded from CDNs.
- **Backend API**: **Node.js** + **Express.js** (`backend/server.js`) serving REST endpoints and managing persistence in `backend/database.json`.
- **Machine Learning Engine**: **Python** (`backend/ml_engine.py`) utilizing Cosine Similarity, TF-IDF feature weighting, and Skill Gap Ontology matching.
- **Local Demo**: The root `index.html` is the dashboard served by Express or Vite. Career analysis, resume parsing, and the personalized roadmap require the Node.js and Python backend to be available.

---

## 🏃 Quickstart: How to Run the Platform

The complete dashboard is served from the Node.js backend. Opening `index.html` directly does not provide the API-backed career analysis, resume parsing, or roadmap.

1. Install Node dependencies once: `npm install --prefix backend`.
2. Install Python dependencies once: `python -m pip install -r backend/requirements.txt` (use `python3` where appropriate).
3. Start the backend: `npm start --prefix backend` (or run `run_server.bat` on Windows after completing the Python dependency step).
4. Open `http://localhost:5000`.

The UI also references browser-delivered scripts, styles, and fonts from CDNs, so a fully offline first load is not guaranteed. Core matching has a standard-library TF-IDF fallback if scikit-learn is unavailable; PDF/DOCX parsing requires `pypdf` and `python-docx`.

---

## 🏆 Hackathon Presentation Pitch Script (3 Minutes)

- **Minute 1: The Hook & The Problem**  
  *"Students often ask how to connect their current skills with the roles they want to pursue. Tech Vortex brings profile-based career matching, explainable skill gaps, resume extraction, and roadmap planning into one demo platform."*

- **Minute 2: The Live Demonstration**  
  *"Observe our career analysis pipeline. We submit the sample candidate profile to the Python engine, review its weighted career match and explainable skill gaps, and open a personalized learning roadmap. Example opportunity cards and market indicators are static demo data."*

- **Minute 3: The Impact & Longevity**  
  *"Tech Vortex is a career-preparation prototype. Its local ontology and deterministic tools help users inspect their profile and plan practice; they do not guarantee employment or workplace outcomes."*

---

**Built with pride for Hackathon Excellence by Team Tech Vortex © 2026.**
