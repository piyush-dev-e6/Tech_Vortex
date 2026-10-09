"""Shared deterministic requirement normalization and skill comparison."""

import json
from pathlib import Path
from typing import Any, Dict, Iterable, List, Mapping, Tuple

from skill_normalizer import display_skill, normalize_term

with Path(__file__).with_name("skill_ontology.json").open("r", encoding="utf-8") as source:
    _ONTOLOGY = json.load(source)

IMPORTANCE_WEIGHT = {"high": 3.0, "medium": 2.0, "low": 1.0}
_LEVEL_RANK = {"beginner": 0, "familiar": 1, "learning": 1, "developing": 1, "intermediate": 2, "advanced": 3, "expert": 4}


def normalize_requirements(requirements: Iterable[Mapping[str, Any]]) -> List[Dict[str, Any]]:
    """Canonicalize and deduplicate requirements while preserving provenance."""
    merged: Dict[str, Dict[str, Any]] = {}
    for item in requirements:
        if not isinstance(item, Mapping):
            continue
        canonical = normalize_term(item.get("canonicalName") or item.get("canonical") or item.get("name") or item.get("skill"))
        if not canonical:
            continue
        importance = str(item.get("importance") or "medium").lower()
        if importance not in IMPORTANCE_WEIGHT:
            importance = "medium"
        source = str(item.get("source") or "manual").lower()
        if source not in {"career", "job", "manual"}:
            source = "manual"
        raw_evidence = item.get("evidence")
        evidence = raw_evidence if isinstance(raw_evidence, list) else [raw_evidence]
        evidence = [str(value).strip()[:400] for value in evidence if value and str(value).strip()]
        try:
            weight = max(0.0, min(10.0, float(item.get("weight", IMPORTANCE_WEIGHT[importance]))))
        except (TypeError, ValueError):
            weight = IMPORTANCE_WEIGHT[importance]
        prerequisites = item.get("prerequisites") if isinstance(item.get("prerequisites"), list) else []
        current = merged.get(canonical)
        if current is None:
            merged[canonical] = {
                "canonicalName": canonical, "displayName": display_skill(canonical),
                "canonical": canonical, "display": display_skill(canonical),
                "importance": importance, "weight": weight, "source": source, "sources": [source],
                "evidence": list(dict.fromkeys(evidence)), "critical": bool(item.get("critical", False)),
                "prerequisites": sorted({normalize_term(value) for value in prerequisites if normalize_term(value)}),
            }
            continue
        if weight > current["weight"]:
            current.update(importance=importance, weight=weight)
        if source not in current["sources"]:
            current["sources"].append(source)
        if source == "job" or current["source"] == "manual":
            current["source"] = source
        current["evidence"] = list(dict.fromkeys(current["evidence"] + evidence))[:10]
        current["critical"] = current["critical"] or bool(item.get("critical", False))
        current["prerequisites"] = sorted(set(current["prerequisites"]) | {normalize_term(value) for value in prerequisites if normalize_term(value)})
    return sorted(merged.values(), key=lambda item: (-IMPORTANCE_WEIGHT[item["importance"]], item["displayName"].casefold()))


def _profile_skill_state(profile: Mapping[str, Any]) -> Tuple[Dict[str, Dict[str, Any]], List[Dict[str, Any]]]:
    confirmed: Dict[str, Dict[str, Any]] = {}
    unconfirmed: List[Dict[str, Any]] = []
    skills = profile.get("skills") if isinstance(profile.get("skills"), list) else []
    for item in skills:
        if isinstance(item, str):
            canonical, level, evidence, is_confirmed = normalize_term(item), "advanced", [], True
        elif isinstance(item, Mapping):
            canonical = normalize_term(item.get("canonicalName") or item.get("canonical") or item.get("name") or item.get("display") or item.get("skill"))
            # A confirmed skill without a proficiency label is evidence of possession;
            # only an explicitly developing/familiar level receives partial credit.
            level = str(item.get("level") or item.get("proficiency") or item.get("status") or "advanced").strip().lower()
            is_confirmed = item.get("confirmed") is not False
            evidence = item.get("evidence") or item.get("evidenceItems") or []
            evidence = evidence if isinstance(evidence, list) else [evidence]
        else:
            continue
        if not canonical:
            continue
        record = {"canonicalName": canonical, "displayName": display_skill(canonical), "level": level, "evidence": evidence}
        if not is_confirmed:
            unconfirmed.append(record)
            continue
        old = confirmed.get(canonical)
        if old is None or _LEVEL_RANK.get(level, 1) > _LEVEL_RANK.get(old["level"], 1):
            confirmed[canonical] = record
        elif evidence:
            old["evidence"] += evidence
    return confirmed, unconfirmed


def compare_requirements(requirements: Iterable[Mapping[str, Any]], profile: Mapping[str, Any]) -> Dict[str, Any]:
    """Classify requirements from confirmed evidence and declared ontology links.

    Priority formula: importance weight × dependency factor × evidence gap;
    missing=1 and developing=0.5. It is a heuristic priority, not a prediction.
    """
    normalized = normalize_requirements(requirements)
    confirmed, unconfirmed = _profile_skill_state(profile)
    partial_map = _ONTOLOGY.get("partialEvidence", {})
    downstream: Dict[str, int] = {}
    available = {item["canonicalName"] for item in normalized}
    for item in normalized:
        for prerequisite in item["prerequisites"]:
            if prerequisite in available:
                downstream[prerequisite] = downstream.get(prerequisite, 0) + 1

    records: List[Dict[str, Any]] = []
    counts = {"matched": 0, "developing": 0, "missing": 0}
    total_weight = covered_weight = 0.0
    for requirement in normalized:
        skill = requirement["canonicalName"]
        profile_item = confirmed.get(skill)
        related = []
        if profile_item:
            status = "developing" if profile_item["level"] in {"beginner", "familiar", "learning", "developing", "in progress", "in_progress"} else "matched"
        else:
            related = [confirmed[normalize_term(name)] for name in partial_map.get(skill, []) if normalize_term(name) in confirmed]
            status = "developing" if related else "missing"
        if status == "matched":
            reason = "Confirmed skill in your profile."
            profile_evidence = profile_item["evidence"]
        elif status == "developing" and profile_item:
            reason = f"{profile_item['displayName']} is confirmed at a developing level, so it provides partial coverage and evidence for this requirement."
            profile_evidence = profile_item["evidence"]
        elif related:
            related_names = [item["displayName"] for item in related]
            reason = f"Confirmed {', '.join(related_names)} experience provides partial evidence through an explicit ontology relationship."
            profile_evidence = [evidence for item in related for evidence in item["evidence"]]
        else:
            related_names = []
            reason = f"No confirmed evidence for {requirement['displayName']} was found in your profile."
            profile_evidence = []
        importance_factor = IMPORTANCE_WEIGHT[requirement["importance"]]
        source_factor = 1.25 if "job" in requirement["sources"] else 1.0
        dependency_factor = 1.0 + min(4, downstream.get(skill, 0)) * 0.15
        gap_factor = 1.0 if status == "missing" else 0.5 if status == "developing" else 0.0
        priority_score = round(importance_factor * source_factor * dependency_factor * gap_factor, 2)
        priority = "high" if priority_score >= 2.5 else "medium" if priority_score >= 1.0 else "low"
        weight = requirement["weight"]
        total_weight += weight
        covered_weight += weight * {"matched": 1.0, "developing": 0.5, "missing": 0.0}[status]
        counts[status] += 1
        records.append({
            **requirement, "status": status, "reason": reason, "profileEvidence": profile_evidence,
            "relatedSkills": [item["displayName"] for item in related],
            "priority": priority if status != "matched" else None,
            "priorityScore": priority_score if status != "matched" else None,
            "priorityMethod": "importance × source relevance (job=1.25, otherwise=1) × (1 + 0.15 per dependent requirement, capped at 4) × evidence gap (missing=1, developing=0.5).",
        })
    gaps = sorted((item for item in records if item["status"] != "matched"), key=lambda item: (-item["priorityScore"], item["displayName"].casefold()))
    return {
        "requirements": records, "prioritizedGaps": gaps,
        "coverageScore": round(100 * covered_weight / total_weight, 2) if total_weight else None,
        "requirementCount": len(records), **{f"{key}Count": value for key, value in counts.items()},
        "unconfirmedCandidates": unconfirmed,
        "scoreFormula": "100 × sum(requirement weight × profile credit) / sum(requirement weight); matched=1, developing=0.5, missing=0.",
        "priorityFormula": "importance × source relevance (job=1.25, otherwise=1) × dependency factor × evidence gap; deterministic priority only, not a hiring prediction.",
    }
