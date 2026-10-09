"""Deterministic extraction and comparison of explicit job skill requirements."""

import re
import argparse
import json
import sys
from typing import Any, Dict, List

from ml_engine import CAREER_ONTOLOGY, SKILL_DEPENDENCIES
from resume_parser import SKILL_VOCABULARY
from skill_normalizer import ALIASES, DISPLAY_NAMES, normalize_term
from requirement_engine import compare_requirements, normalize_requirements


def _display(skill: str) -> str:
    return DISPLAY_NAMES.get(skill, skill.title())


def _skill_catalog() -> List[str]:
    values = set(ALIASES.values()) | set(SKILL_VOCABULARY)
    for career in CAREER_ONTOLOGY.values():
        values.update(career.get("core_skills", []))
        values.update(career.get("complementary_skills", []))
    return sorted({normalize_term(value) for value in values if str(value).strip()}, key=lambda value: (-len(value), value))


def _phrase_pattern(phrase: str) -> re.Pattern:
    escaped = re.escape(phrase.strip())
    escaped = escaped.replace(r"\ ", r"\s+")
    return re.compile(r"(?<![a-z0-9])" + escaped + r"(?![a-z0-9])", re.IGNORECASE)


SKILL_PATTERNS = [(skill, _phrase_pattern(skill)) for skill in _skill_catalog()]
ALIAS_PATTERNS = [(alias, normalize_term(canonical), _phrase_pattern(alias)) for alias, canonical in ALIASES.items()]


def _importance(context: str) -> tuple[str, float]:
    text = context.lower()
    if re.search(r"\b(required|required skills|must[- ]have|essential|minimum qualifications)\b", text):
        return "high", 1.25
    if re.search(r"\b(preferred|nice[- ]to[- ]have|bonus|a plus|desirable)\b", text):
        return "low", 0.65
    return "medium", 1.0


def _extract_requirements(description: str) -> List[Dict[str, Any]]:
    found: Dict[str, Dict[str, Any]] = {}
    section_context = ""
    for line in description.splitlines():
        content = line.strip(" \t-*•\u2022")
        if not content:
            continue
        heading = re.sub(r"[:\s]+$", "", content).lower()
        if len(content) <= 120 and re.match(r"^(about the role|responsibilities|requirements|required qualifications|required skills|minimum qualifications|preferred qualifications|preferred skills|nice to have|skills|what you.?ll do|qualifications|experience)\b", heading):
            section_context = content
        sentences = re.split(r"(?<=[.!?;])\s+(?=[A-Z0-9])", content)
        for sentence in sentences:
            matches = []
            for skill, pattern in SKILL_PATTERNS:
                if pattern.search(sentence):
                    matches.append(skill)
            for alias, canonical, pattern in ALIAS_PATTERNS:
                if pattern.search(sentence):
                    matches.append(canonical)
            importance, weight = _importance(f"{section_context} {sentence}")
            for skill in matches:
                record = found.get(skill)
                if record is None:
                    found[skill] = {"canonicalName": skill, "displayName": _display(skill), "importance": importance,
                                    "source": "job", "weight": weight, "evidence": [sentence[:400]], "critical": importance == "high"}
                elif weight > record["weight"]:
                    record.update(importance=importance, weight=weight, evidence=[sentence[:400]], critical=importance == "high")
                elif sentence[:400] not in record["evidence"]:
                    record["evidence"].append(sentence[:400])
    for requirement in found.values():
        requirement["prerequisites"] = SKILL_DEPENDENCIES.get(requirement["canonicalName"], [])
        requirement["canonical"] = requirement["canonicalName"]
        requirement["display"] = requirement["displayName"]
    return normalize_requirements(found.values())


def analyze_job_description(profile: Dict[str, Any], job_description: str, job_title: str = "", company: str = "") -> Dict[str, Any]:
    """Extract only known, explicitly named skills and compare against confirmed profile skills.

    The score measures weighted coverage of extracted skills. It is not a hiring
    probability, semantic similarity, or an assessment of undocumented ability.
    """
    if not isinstance(profile, dict):
        raise ValueError("A profile object is required.")
    if not isinstance(job_description, str) or len(job_description.strip()) < 20:
        raise ValueError("Paste a job description with at least 20 characters.")
    if len(job_description) > 30000:
        raise ValueError("Job description must be 30,000 characters or fewer.")

    requirements = _extract_requirements(job_description)
    comparison = compare_requirements(requirements, profile)
    requirements = [{
        **item, "status": item["status"],
        "legacyStatus": "not_found" if item["status"] == "missing" else item["status"],
        "classification": item["status"],
        "profileEvidence": " · ".join(str(value.get("text") or value) if isinstance(value, dict) else str(value) for value in item["profileEvidence"]),
        "evidence": " · ".join(item["evidence"]),
    } for item in comparison["requirements"]]
    display_by_skill = {item["canonicalName"]: item for item in requirements}
    priority_gaps = [display_by_skill[item["canonicalName"]] for item in comparison["prioritizedGaps"]]
    readiness_simulations = []
    for gap in priority_gaps[:5]:
        simulated_profile = {**profile}
        simulated_skills = list(profile.get("skills", [])) if isinstance(profile.get("skills"), list) else []
        simulated_skills.append({"canonical": gap["canonicalName"], "confirmed": True, "level": "advanced"})
        simulated_profile["skills"] = simulated_skills
        simulated_score = compare_requirements(requirements, simulated_profile)["coverageScore"]
        if comparison["coverageScore"] is not None and simulated_score is not None:
            readiness_simulations.append({
                "canonical": gap["canonicalName"], "display": gap["displayName"],
                "status": gap["status"], "priority": gap["priority"],
                "currentScore": comparison["coverageScore"], "simulatedScore": simulated_score,
                "improvement": round(simulated_score - comparison["coverageScore"], 2),
            })
    lines = [line.strip() for line in job_description.splitlines() if line.strip()]
    title = str(job_title or "").strip()[:120] or (lines[0][:120] if lines and len(lines[0]) <= 120 else "Job description")
    company_name = str(company or "").strip()[:120]
    job = {"title": title}
    if company_name:
        job["company"] = company_name
    return {
        "job": job, "coverageScore": comparison["coverageScore"],
        "scoreLabel": "weighted coverage of extracted requirements",
        "requirementCount": comparison["requirementCount"], "matchedCount": comparison["matchedCount"],
        "developingCount": comparison["developingCount"], "notFoundCount": comparison["missingCount"],
        "skillsYouHave": [item for item in requirements if item["status"] == "matched"],
        "developingSkills": [item for item in requirements if item["status"] == "developing"],
        "notFoundSkills": [item for item in requirements if item["status"] == "missing"],
        "priorityGaps": priority_gaps, "requirements": requirements,
        "readinessSimulations": readiness_simulations,
        "scoreFormula": comparison["scoreFormula"], "priorityFormula": comparison["priorityFormula"],
        "methodology": "Deterministic phrase extraction against the local canonical skill vocabulary, then shared evidence-aware comparison. Only explicit skill mentions are included; missing profile evidence does not mean the candidate lacks the skill. The coverage score is not a hiring probability.",
        "warnings": [] if requirements else ["No skills from the supported vocabulary were explicitly identified. The description may use skills outside the current vocabulary."],
    }


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--input", required=True, help="JSON file with profile and jobDescription")
    args = parser.parse_args()
    try:
        with open(args.input, "r", encoding="utf-8") as source:
            payload = json.load(source)
        result = analyze_job_description(payload.get("profile", {}), payload.get("jobDescription", ""), payload.get("jobTitle", ""), payload.get("company", ""))
        print(json.dumps(result, ensure_ascii=False))
    except (OSError, json.JSONDecodeError, ValueError) as error:
        print(json.dumps({"error": str(error)}, ensure_ascii=False), file=sys.stderr)
        raise SystemExit(2)
