"""Shared canonical skill names and aliases for parsing and career matching."""

import re
import json
from pathlib import Path
from typing import Any, Iterable, List

_ONTOLOGY_PATH = Path(__file__).with_name("skill_ontology.json")
with _ONTOLOGY_PATH.open("r", encoding="utf-8") as _source:
    _ONTOLOGY = json.load(_source)
ALIASES = _ONTOLOGY["aliases"]
DISPLAY_NAMES = _ONTOLOGY["displayNames"]
KNOWN_SKILLS = set(_ONTOLOGY["skills"]) | set(ALIASES.values())


def normalize_term(term: Any) -> str:
    value = re.sub(r"\s+", " ", str(term or "").strip().lower())
    return ALIASES.get(value, value)


def is_known_skill(term: Any) -> bool:
    """Return whether a term resolves to a skill explicitly recorded in the ontology."""
    return normalize_term(term) in KNOWN_SKILLS


def normalize_terms(terms: Any) -> List[str]:
    if not isinstance(terms, (list, tuple, set)):
        return []
    return sorted({normalized for term in terms if (normalized := normalize_term(term))})


def display_skill(skill: Any) -> str:
    canonical = normalize_term(skill)
    return DISPLAY_NAMES.get(canonical, canonical.title())
