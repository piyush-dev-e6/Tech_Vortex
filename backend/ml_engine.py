#!/usr/bin/env python3
"""Deterministic, explainable career matching against a curated role ontology."""

import argparse
import json
import math
import re
from typing import Any, Dict, Iterable, List, Optional, Sequence, Tuple

from skill_normalizer import display_skill as _display_skill
from skill_normalizer import ALIASES, normalize_term, normalize_terms
from requirement_engine import compare_requirements

try:
    from sklearn.feature_extraction.text import TfidfVectorizer
    from sklearn.metrics.pairwise import cosine_similarity
except ImportError:  # Keep local/offline demos usable without optional packages.
    TfidfVectorizer = None
    cosine_similarity = None


# Canonical Ontology of Career Tracks & Skill Requirements. Existing metadata is
# retained so existing API clients can continue displaying it.
CAREER_ONTOLOGY = {
    "AI/ML Solutions Engineer": {
        "id": "ai-ml-engineer", "category": "Artificial Intelligence & Data",
        "core_skills": ["python", "machine learning", "deep learning", "pytorch", "tensorflow", "nlp", "llm", "langchain", "vector db", "scikit-learn", "data structures"],
        "complementary_skills": ["docker", "fastapi", "rest api", "git", "cloud", "sql", "math", "numpy", "pandas"],
        "weight_education": 0.20, "weight_skills": 0.55, "weight_interests": 0.25,
        "market_growth_yoy": 38.4, "avg_fresher_ctc": "₹9.5 - 16 LPA", "avg_experienced_ctc": "₹24 - 45 LPA",
        "hiring_difficulty": "Medium-High", "growth_tier": "Exponential",
        "critical_keywords": ["generative ai", "neural networks", "transformer", "prompt engineering", "agentic workflows"]
    },
    "Full-Stack Cloud Architect": {
        "id": "fullstack-architect", "category": "Software Engineering & Cloud",
        "core_skills": ["react", "javascript", "typescript", "node.js", "express", "sql", "mongodb", "postgresql", "rest api", "html", "css", "next.js"],
        "complementary_skills": ["docker", "aws", "git", "tailwind", "redis", "ci/cd", "microservices"],
        "weight_education": 0.15, "weight_skills": 0.60, "weight_interests": 0.25,
        "market_growth_yoy": 29.2, "avg_fresher_ctc": "₹8.0 - 14 LPA", "avg_experienced_ctc": "₹22 - 38 LPA",
        "hiring_difficulty": "High Demand", "growth_tier": "High Sustained",
        "critical_keywords": ["react 18", "scalable web services", "full stack", "cloud native", "api design"]
    },
    "Data Intelligence & Analytics Specialist": {
        "id": "data-intelligence", "category": "Data Science & BI",
        "core_skills": ["sql", "python", "pandas", "numpy", "tableau", "power bi", "statistics", "data analysis", "excel", "data visualization"],
        "complementary_skills": ["r", "snowflake", "bigquery", "etl", "machine learning", "git", "storytelling"],
        "weight_education": 0.20, "weight_skills": 0.55, "weight_interests": 0.25,
        "market_growth_yoy": 25.1, "avg_fresher_ctc": "₹7.5 - 13 LPA", "avg_experienced_ctc": "₹18 - 32 LPA",
        "hiring_difficulty": "Steady High", "growth_tier": "High Sustained",
        "critical_keywords": ["business intelligence", "sql optimization", "predictive dashboards", "data warehousing"]
    },
    "Cloud & DevOps Reliability Engineer": {
        "id": "devops-cloud", "category": "Infrastructure & Systems",
        "core_skills": ["linux", "docker", "kubernetes", "aws", "azure", "ci/cd", "git", "bash", "terraform", "python", "networking"],
        "complementary_skills": ["ansible", "prometheus", "grafana", "jenkins", "golang", "security"],
        "weight_education": 0.15, "weight_skills": 0.65, "weight_interests": 0.20,
        "market_growth_yoy": 33.7, "avg_fresher_ctc": "₹8.5 - 15 LPA", "avg_experienced_ctc": "₹25 - 42 LPA",
        "hiring_difficulty": "Critical Shortage", "growth_tier": "Exponential",
        "critical_keywords": ["container orchestration", "infrastructure as code", "zero downtime", "sre"]
    },
    "Cybersecurity Defense Analyst": {
        "id": "cyber-defense", "category": "Security & Risk",
        "core_skills": ["networking", "linux", "python", "ethical hacking", "siem", "cryptography", "penetration testing", "wireshark"],
        "complementary_skills": ["bash", "cloud security", "owasp", "c++", "firewalls"],
        "weight_education": 0.20, "weight_skills": 0.60, "weight_interests": 0.20,
        "market_growth_yoy": 35.0, "avg_fresher_ctc": "₹8.0 - 15 LPA", "avg_experienced_ctc": "₹24 - 40 LPA",
        "hiring_difficulty": "Extreme Shortage", "growth_tier": "Exponential",
        "critical_keywords": ["zero trust", "threat intelligence", "soc analyst", "vulnerability assessment"]
    }
}

# Directed learning dependencies are intentionally limited to role ontology
# skills. A dependency can order target-role skills but cannot add new gaps.
SKILL_DEPENDENCIES = {
    "numpy": ["python"], "pandas": ["python", "numpy"],
    "machine learning": ["python", "numpy", "pandas"],
    "deep learning": ["machine learning"], "pytorch": ["deep learning"],
    "tensorflow": ["deep learning"], "nlp": ["machine learning"],
    "llm": ["deep learning", "nlp"], "langchain": ["llm"],
    "vector db": ["python"], "fastapi": ["python"],
    "html": [], "css": ["html"], "javascript": ["html", "css"],
    "react": ["javascript"], "typescript": ["javascript"],
    "node.js": ["javascript"], "express": ["node.js"],
    "next.js": ["react", "javascript"], "rest api": ["express"],
    "postgresql": ["sql"], "microservices": ["express", "rest api", "docker"],
    "ci/cd": ["git", "docker"],
    "docker": ["linux"], "kubernetes": ["docker"], "terraform": ["aws"],
    "ansible": ["linux"], "prometheus": ["kubernetes"], "grafana": ["prometheus"],
    "ethical hacking": ["networking", "linux"], "wireshark": ["networking"],
    "siem": ["networking", "linux"], "penetration testing": ["ethical hacking"],
    "firewalls": ["networking"], "cryptography": ["networking"],
    "data analysis": ["sql", "pandas"], "tableau": ["data analysis"],
    "power bi": ["data analysis"], "data visualization": ["data analysis"],
    "snowflake": ["sql"], "bigquery": ["sql"], "etl": ["sql", "python"],
    "storytelling": ["data analysis"],
}

SKILL_VERIFICATION = {
    "python": "Write a small role-related script with input validation and at least three passing tests.",
    "cuda": "Run a CUDA vector-add kernel against a CPU reference for three input sizes and record the maximum absolute difference.",
    "numpy": "Implement a vectorized array calculation and compare its output with a known expected result.",
    "pandas": "Load a sample dataset, handle missing values, and produce a reproducible grouped summary.",
    "machine learning": "Train a baseline model with a held-out split and report the chosen metric and baseline comparison.",
    "deep learning": "Train a small neural network and record its loss curve and evaluation result.",
    "pytorch": "Build and train a small PyTorch model; document the dataset split, seed, and evaluation metric.",
    "tensorflow": "Build and train a small TensorFlow model; document the dataset split and evaluation metric.",
    "nlp": "Create a text preprocessing and classification pipeline and evaluate it on held-out examples.",
    "llm": "Implement an LLM task with a fixed test set and record incorrect or unsupported outputs.",
    "langchain": "Build a small chain with explicit inputs, outputs, and tests for an invalid input case.",
    "vector db": "Index a small labeled document set and demonstrate retrieval with relevant source records.",
    "fastapi": "Expose a validated endpoint and verify success, invalid input, and error responses.",
    "docker": "Build and run the project in a container from a clean checkout using documented commands.",
    "kubernetes": "Deploy a container with a service and demonstrate a health check and a rolling update.",
    "terraform": "Provision and destroy a minimal reviewed configuration; include a successful plan output.",
    "linux": "Complete a repeatable shell task using files, processes, permissions, and captured command output.",
    "networking": "Explain and inspect a client-server exchange using addresses, ports, DNS, and transport protocol evidence.",
    "git": "Demonstrate a clean branch, reviewable commits, and recovery from a deliberately introduced conflict.",
    "sql": "Write tested joins, aggregates, and a window query against a small relational dataset.",
    "postgresql": "Create a relational schema, constraints, and queries; verify behavior with seeded data.",
    "tableau": "Build a dashboard from a documented dataset and validate each displayed metric against a query.",
    "power bi": "Build a report with a documented measure and reconcile its result against source data.",
    "data analysis": "Answer a stated question with a reproducible query or notebook and a checked result.",
    "statistics": "Select and apply an appropriate statistical summary or test, stating its assumptions.",
    "data visualization": "Create a labeled chart whose encoding supports a stated comparison and matches the source values.",
    "javascript": "Implement a small tested feature with explicit handling for an invalid or empty input.",
    "typescript": "Convert a small JavaScript module to typed interfaces and pass the configured type check.",
    "react": "Build a component with state, loading/empty states, and a test for a key interaction.",
    "node.js": "Implement a small asynchronous service with input validation and tests for success and failure.",
    "express": "Build a REST route with validation and tests for expected status codes and response shape.",
    "rest api": "Document and test one resource endpoint, including success, not-found, and invalid-input cases.",
    "html": "Build a semantic page structure and verify labels, headings, and keyboard navigation.",
    "css": "Implement a responsive layout and verify it at narrow and wide viewport sizes.",
    "next.js": "Build a routed page and verify navigation, loading behavior, and a production build.",
    "mongodb": "Model a small document collection and verify CRUD behavior and an indexed query.",
    "aws": "Deploy or configure a minimal service and document the resource, access boundaries, and cleanup.",
    "azure": "Configure a minimal service and document the resource, access boundaries, and cleanup.",
    "cloud": "Deploy a small service and record its configuration, health check, and teardown steps.",
    "bash": "Write a shell script that checks inputs, returns useful status codes, and passes sample runs.",
    "terraform": "Validate a minimal infrastructure configuration and explain its plan before applying.",
    "ethical hacking": "Complete an authorized lab exercise and document scope, steps, and remediation.",
    "wireshark": "Capture an authorized sample exchange and identify protocol fields that support your explanation.",
    "cryptography": "Use a standard cryptographic library in a small demo and test invalid input handling.",
    "siem": "Ingest sample logs, write a detection rule, and verify it against positive and negative examples.",
    "penetration testing": "Complete a scoped lab assessment and provide reproducible findings with remediation.",
    "prometheus": "Expose or scrape a metric and verify a query against known sample activity.",
    "grafana": "Build a dashboard panel and verify its query and units against source metrics.",
    "ci/cd": "Run an automated pipeline that tests a change and fails predictably for a failing test.",
}


def _experience_level(profile: Dict[str, Any]) -> str:
    value = profile.get("experienceLevel") or profile.get("experience_level")
    return str(value).strip().lower() if value else "not specified"


def generate_learning_roadmap(candidate_profile: Dict[str, Any], selected_career: Any) -> Dict[str, Any]:
    """Build the extended deterministic plan while preserving the existing entry point."""
    from roadmap_engine import generate_personalized_roadmap
    return generate_personalized_roadmap(candidate_profile, selected_career)

def _candidate_skill_levels(profile: Dict[str, Any]) -> Tuple[Dict[str, str], List[str]]:
    """Return canonical skill->proficiency status and unrecognized profile skills.

    Plain skill strings are treated as mastered because the existing profile
    contract has no proficiency field. Profiles may optionally provide
    ``skillLevels`` as a mapping or use skill objects with a level/status.
    """
    levels: Dict[str, str] = {}
    declared_levels = profile.get("skillLevels", {})
    if not isinstance(declared_levels, dict):
        declared_levels = {}

    skills = profile.get("skills", [])
    if not isinstance(skills, (list, tuple, set)):
        skills = []
    for item in skills:
        if isinstance(item, dict):
            if item.get("confirmed") is False:
                continue
            raw_name = item.get("canonical") or item.get("name") or item.get("skill") or item.get("title") or ""
            raw_level = item.get("level") or item.get("status") or declared_levels.get(raw_name, "mastered")
        else:
            raw_name = item
            raw_level = declared_levels.get(str(raw_name), declared_levels.get(normalize_term(raw_name), "mastered"))
        skill = normalize_term(raw_name)
        if not skill:
            continue
        level = str(raw_level or "mastered").strip().lower()
        status = "developing" if level in {"developing", "learning", "in progress", "beginner", "intermediate"} else "mastered"
        if skill not in levels or status == "mastered":
            levels[skill] = status

    vocabulary = {normalize_term(skill) for career in CAREER_ONTOLOGY.values()
                  for skill in career["core_skills"] + career["complementary_skills"]}
    unmatched = sorted(skill for skill in levels if skill not in vocabulary)
    return levels, unmatched


def analyze_skill_gap(candidate_profile: Dict[str, Any], selected_career: Any) -> Dict[str, Any]:
    """Compare confirmed profile evidence against canonical career requirements."""
    career_entry = next(
        ((title, career) for title, career in CAREER_ONTOLOGY.items()
         if selected_career in (title, career["id"])),
        None,
    )
    if career_entry is None:
        raise ValueError(f"Unknown career: {selected_career}")

    title, career = career_entry
    core = {normalize_term(skill) for skill in career["core_skills"]}
    _, unmatched = _candidate_skill_levels(candidate_profile)
    requirements = []
    for raw_skill in career["core_skills"] + career["complementary_skills"]:
        skill = normalize_term(raw_skill)
        requirements.append({
            "canonicalName": skill, "importance": "high" if skill in core else "medium",
            "source": "career", "weight": 2.0 if skill in core else 1.0,
            "critical": skill in core, "evidence": [f"{('Core' if skill in core else 'Complementary')} requirement in the {title} career ontology."],
            "prerequisites": SKILL_DEPENDENCIES.get(skill, []),
        })
    comparison = compare_requirements(requirements, candidate_profile)
    details = []
    for requirement in comparison["requirements"]:
        legacy_status = requirement["status"]
        if legacy_status == "matched": legacy_status = "mastered"
        elif legacy_status == "missing" and requirement["critical"]: legacy_status = "critical_missing"
        details.append({
            **requirement, "skill": requirement["displayName"], "status": legacy_status,
            "matchStatus": requirement["status"],
        })
    mastered = [item["skill"] for item in details if item["matchStatus"] == "matched"]
    developing = [item["skill"] for item in details if item["matchStatus"] == "developing"]
    missing = [item["skill"] for item in details if item["matchStatus"] == "missing" and not item["critical"]]
    critical_missing = [item["skill"] for item in details if item["matchStatus"] == "missing" and item["critical"]]
    priority_gaps = [{
        **item, "skill": item["displayName"], "canonicalSkill": item["canonicalName"],
        "prerequisites": item["prerequisites"], "relatedSkills": item["relatedSkills"],
    } for item in comparison["prioritizedGaps"]]
    recommended = [item["skill"] for item in priority_gaps]
    readiness = comparison["coverageScore"] if comparison["coverageScore"] is not None else 0.0
    return {
        "career": title, "careerId": career["id"], "readinessScore": readiness,
        "masteredSkills": mastered, "developingSkills": developing, "missingSkills": missing,
        "criticalMissingSkills": critical_missing, "recommendedSkills": recommended,
        "skillDetails": details, "requirements": comparison["requirements"],
        "prioritizedGaps": priority_gaps, "unmatchedProfileSkills": unmatched,
        "readinessMethod": comparison["scoreFormula"], "priorityMethod": comparison["priorityFormula"],
        "readinessNotice": "Skill coverage estimate only; it does not establish job readiness.",
    }


def _tfidf_cosine(candidate_doc: str, requirement_docs: Sequence[str]) -> List[float]:
    documents = [candidate_doc] + list(requirement_docs)
    if TfidfVectorizer is not None:
        matrix = TfidfVectorizer(token_pattern=r"(?u)\b[\w+#./-]+\b", ngram_range=(1, 2), sublinear_tf=True).fit_transform(documents)
        return [float(value) for value in cosine_similarity(matrix[0:1], matrix[1:]).ravel()]

    # Standard-library fallback: smoothed IDF, sublinear TF, L2 normalization.
    tokenized = [re.findall(r"[\w+#./-]+", doc.lower()) for doc in documents]
    document_frequency: Dict[str, int] = {}
    for tokens in tokenized:
        for token in set(tokens):
            document_frequency[token] = document_frequency.get(token, 0) + 1
    document_count = len(documents)

    def vector(tokens: Sequence[str]) -> Dict[str, float]:
        counts: Dict[str, int] = {}
        for token in tokens:
            counts[token] = counts.get(token, 0) + 1
        weights = {token: (1.0 + math.log(count)) * (math.log((1 + document_count) / (1 + document_frequency[token])) + 1.0)
                   for token, count in counts.items()}
        norm = math.sqrt(sum(weight * weight for weight in weights.values()))
        return {token: weight / norm for token, weight in weights.items()} if norm else {}

    candidate_vector = vector(tokenized[0])
    return [sum(candidate_vector.get(token, 0.0) * weight for token, weight in vector(tokens).items()) for tokens in tokenized[1:]]


def _project_text(projects: Any) -> str:
    if isinstance(projects, str):
        return projects.strip()
    if not isinstance(projects, list):
        return ""
    chunks = []
    for project in projects:
        if isinstance(project, str):
            chunks.append(project)
        elif isinstance(project, dict):
            chunks.extend(str(project.get(key, "")) for key in ("name", "title", "description", "summary", "technologies", "skills"))
    return " ".join(chunks).strip()


def _project_skill_set(projects: Any) -> set:
    text = _project_text(projects).lower()
    found = set()
    # Explicit skill aliases and ontology terms are recognized only at token boundaries.
    vocabulary = set(ALIASES) | {skill for career in CAREER_ONTOLOGY.values() for skill in career["core_skills"] + career["complementary_skills"]}
    for term in vocabulary:
        canonical = normalize_term(term)
        if re.search(r"(?<![\w])" + re.escape(term) + r"(?![\w])", text):
            found.add(canonical)
    return found


def _education_fit(profile: Dict[str, Any], role: str, career: Dict[str, Any]) -> float:
    education = profile.get("education") if isinstance(profile.get("education"), dict) else {}
    raw_cgpa = profile.get("cgpa", education.get("cgpa"))
    has_cgpa = raw_cgpa not in (None, "")
    try:
        cgpa = min(10.0, max(0.0, float(raw_cgpa))) if has_cgpa else 0.0
    except (TypeError, ValueError):
        cgpa = 0.0
        has_cgpa = False
    academic = cgpa * 10.0
    degree = normalize_term(profile.get("degree") or education.get("degree", ""))
    role_text = (role + " " + career["category"]).lower()
    domain_terms = {
        "ai": ["computer", "software", "data", "mathemat", "statistics", "artificial intelligence"],
        "web": ["computer", "software", "information technology", "it"],
        "data": ["computer", "software", "data", "statistics", "mathemat", "business"],
        "cloud": ["computer", "software", "information technology", "it", "network"],
        "cyber": ["computer", "software", "information technology", "it", "cyber", "security", "network"]
    }
    key = "ai" if "ai/" in role_text else ("web" if "full-stack" in role_text else ("data" if "data" in role_text else ("cloud" if "cloud" in role_text or "infrastructure" in role_text else "cyber")))
    if not degree and not has_cgpa:
        return 0.0
    domain_fit = 70.0 if any(term in degree for term in domain_terms[key]) else (50.0 if degree else 0.0)
    # CGPA contributes only 30% of this already-small (10%) component.
    if not degree:
        return round(academic, 2)
    if not has_cgpa:
        return round(domain_fit, 2)
    return round(domain_fit * 0.70 + academic * 0.30, 2)


def _interest_alignment(interests: Sequence[str], role: str, career: Dict[str, Any]) -> float:
    if not interests:
        return 0.0
    target = set(re.findall(r"[a-z0-9]+", (role + " " + career["category"] + " " + " ".join(career["critical_keywords"])).lower()))
    tokens = set()
    for interest in interests:
        normalized = normalize_term(interest)
        tokens.update(re.findall(r"[a-z0-9]+", normalized))
    # Match by meaningful domain tokens; deliberately capped and contributes only 10%.
    relevant = tokens & target
    return min(100.0, 100.0 * len(relevant) / max(1, min(3, len(target))))


def analyze_candidate(candidate_profile: Dict[str, Any]) -> Dict[str, Any]:
    raw_skills = candidate_profile.get("skills", [])
    profile_skill_levels, _ = _candidate_skill_levels(candidate_profile)
    student_skills = sorted(profile_skill_levels)
    interests = normalize_terms(candidate_profile.get("interests", []))
    projects = candidate_profile.get("projects", [])
    project_text = _project_text(projects)
    project_skills = _project_skill_set(projects)

    careers = list(CAREER_ONTOLOGY.items())
    requirement_docs = [" ".join(c["core_skills"] + c["complementary_skills"]) for _, c in careers]
    similarities = _tfidf_cosine(" ".join(student_skills), requirement_docs)
    scored_careers = []

    for (title, career), similarity in zip(careers, similarities):
        core = [normalize_term(s) for s in career["core_skills"]]
        complementary = [normalize_term(s) for s in career["complementary_skills"]]
        possessed_core = [s for s in core if s in student_skills]
        possessed_complementary = [s for s in complementary if s in student_skills]
        missing_core = [s for s in core if s not in student_skills]
        missing_complementary = [s for s in complementary if s not in student_skills]

        semantic = round(similarity * 100.0, 2)
        core_coverage = round(100.0 * len(possessed_core) / max(1, len(core)), 2)
        if project_text:
            project_relevance = round(100.0 * len(project_skills & set(core)) / max(1, len(core)), 2)
        else:
            project_relevance = 0.0
        education_fit = _education_fit(candidate_profile, title, career)
        interest_alignment = _interest_alignment(interests, title, career)

        components = {
            "semanticSimilarity": semantic,
            "coreSkillCoverage": core_coverage,
            "projectRelevance": project_relevance,
            "educationFit": education_fit,
            "interestAlignment": interest_alignment,
        }
        overall = round(
            semantic * 0.40 + core_coverage * 0.25 + project_relevance * 0.15
            + education_fit * 0.10 + interest_alignment * 0.10, 2
        )
        components["overall"] = overall

        why = []
        if possessed_core:
            why.append("Core skills match: " + ", ".join(possessed_core[:5]))
        if possessed_complementary:
            why.append("Complementary skills match: " + ", ".join(possessed_complementary[:4]))
        if project_relevance > 0:
            why.append("Project details mention role skills: " + ", ".join(sorted(project_skills & set(core))[:4]))
        if interests and interest_alignment > 0:
            why.append("Interests align with role domain")
        strengths = possessed_core + possessed_complementary
        next_skills = missing_core[:5]
        skill_gap = analyze_skill_gap(candidate_profile, career["id"])
        learning_roadmap = generate_learning_roadmap(candidate_profile, career["id"])
        scored_careers.append({
            "title": title, "id": career["id"], "category": career["category"],
            "matchScore": overall,
            "marketGrowth": f"+{career['market_growth_yoy']}% YoY",
            "fresherSalary": career["avg_fresher_ctc"], "experiencedSalary": career["avg_experienced_ctc"],
            "hiringDifficulty": career["hiring_difficulty"], "growthTier": career["growth_tier"],
            "matchingSkills": [s.title() for s in possessed_core + possessed_complementary],
            "missingSkills": [s.title() for s in (missing_core + missing_complementary)[:5]],
            "requiredSkills": [s.title() for s in career["core_skills"][:6]],
            "criticalKeywords": career["critical_keywords"],
            "possessedCoreSkills": [s.title() for s in possessed_core],
            "possessedComplementarySkills": [s.title() for s in possessed_complementary],
            "missingCoreSkills": [s.title() for s in missing_core],
            "missingComplementarySkills": [s.title() for s in missing_complementary],
            "scoreBreakdown": components,
            "whyMatched": why,
            "strengths": [s.title() for s in strengths],
            "missingCriticalSkills": [s.title() for s in missing_core[:5]],
            "recommendedNextSkills": [s.title() for s in next_skills],
            "skillGapAnalysis": skill_gap,
            "learningRoadmap": learning_roadmap,
        })

    scored_careers.sort(key=lambda result: (-result["matchScore"], result["id"]))
    recommendations = scored_careers[:4]
    top = recommendations[0]
    requested_career = candidate_profile.get("targetCareer") or candidate_profile.get("target_career") or candidate_profile.get("careerId")
    requested_entry = next(((name, role) for name, role in CAREER_ONTOLOGY.items()
                            if requested_career in (name, role["id"])), None)
    from roadmap_engine import catalogue_track_exists
    if requested_entry:
        selected_roadmap = generate_learning_roadmap(candidate_profile, requested_entry[1]["id"])
        selected_skill_gap = analyze_skill_gap(candidate_profile, requested_entry[1]["id"])
    elif catalogue_track_exists(requested_career):
        selected_roadmap = generate_learning_roadmap(candidate_profile, requested_career)
        selected_skill_gap = selected_roadmap.get("skillGapAnalysis")
    else:
        selected_roadmap = generate_learning_roadmap(candidate_profile, top["id"])
        selected_skill_gap = analyze_skill_gap(candidate_profile, top["id"])
    vectorizer_name = "scikit-learn TfidfVectorizer" if TfidfVectorizer is not None else "standard-library TF-IDF fallback"
    return {
        "pipelineStatus": "SUCCESS_EXECUTED",
        "scoringMethod": "hybrid_tfidf_ontology_v1",
        "stages": [
            {"step": 1, "name": "Student Information Ingested", "status": "Completed", "details": f"{candidate_profile.get('name', 'Candidate')} - {len(student_skills)} canonical skills"},
            {"step": 2, "name": "TF-IDF Feature Vectorization", "status": "Completed", "details": f"Compared candidate skill document with role requirements using {vectorizer_name}"},
            {"step": 3, "name": "Skills, Projects, Education & Interests", "status": "Completed", "details": "Scored explicit skill coverage, supplied project evidence, modest education fit, and interest alignment"},
            {"step": 4, "name": "Explainable Career Ranking", "status": "Completed", "details": f"Ranked {len(scored_careers)} ontology roles by weighted similarity score"},
            {"step": 5, "name": "Skill Gaps & Learning Plan Delivered", "status": "Completed", "details": "Returned explainable gaps, dependency-ordered learning phases, project milestones, and verification checks; no job data queried"},
        ],
        "topRecommendations": recommendations,
        "overallTalentScore": round(sum(r["matchScore"] for r in recommendations[:2]) / min(2, len(recommendations)), 2),
        "primaryRecommendedRole": top["title"],
        "topSkillsPossessed": [s.title() for s in student_skills[:8]],
        "highPrioritySkillsToLearn": top["recommendedNextSkills"],
        "skillGapAnalysis": selected_skill_gap,
        "learningRoadmap": selected_roadmap,
    }


def main() -> None:
    parser = argparse.ArgumentParser(description="Explainable hybrid career matching engine")
    parser.add_argument("--profile", type=str)
    parser.add_argument("--test", action="store_true")
    args = parser.parse_args()
    profile = {
        "name": "Demo Candidate", "degree": "B.Tech Computer Science", "cgpa": "8.5",
        "skills": ["Python", "React", "Node.js", "Machine Learning", "SQL", "Git", "JavaScript"],
        "interests": ["AI & Machine Learning", "Full Stack Development", "Cloud Systems"],
    }
    if args.profile:
        with open(args.profile, "r", encoding="utf-8") as source:
            profile = json.load(source)
    print(json.dumps(analyze_candidate(profile), indent=2))


if __name__ == "__main__":
    main()
