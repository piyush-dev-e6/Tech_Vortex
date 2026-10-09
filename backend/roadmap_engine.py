"""Deterministic roadmap composition over career, job, goal, and skill evidence."""

import json
import logging
import re
from pathlib import Path
from typing import Any, Dict, List, Mapping, Optional, Tuple
from urllib.parse import urlparse

from requirement_engine import compare_requirements
from skill_normalizer import display_skill, is_known_skill, normalize_term
from ml_engine import CAREER_ONTOLOGY, SKILL_DEPENDENCIES, SKILL_VERIFICATION, analyze_skill_gap


LEVEL_RANK = {"beginner": 0, "familiar": 1, "developing": 1, "learning": 1,
              "intermediate": 2, "advanced": 3, "expert": 4, "mastered": 4}
PRIORITY_RANK = {"critical": 0, "high": 1, "medium": 2, "low": 3}
STEP_STATES = {"not_started", "in_progress", "completed"}


_LOGGER = logging.getLogger(__name__)
_CATALOGUE_PATH = Path(__file__).resolve().parent.parent / "tech_vortex_roadmap_catalogue" / "roadmap_catalogue.json"
_CATALOGUE_TRACKS: Dict[str, Dict[str, Any]] = {}
_CATALOGUE_RESOURCES: Dict[str, Dict[str, Any]] = {}
_CATALOGUE_ERROR: Optional[str] = None
_CATALOGUE_WARNINGS: List[str] = []
_VIDEO_ID = re.compile(r"^[A-Za-z0-9_-]{11}$")


def _valid_https_url(value: Any, hosts: Optional[set] = None) -> Optional[str]:
    if not isinstance(value, str):
        return None
    parsed = urlparse(value)
    if parsed.scheme != "https" or not parsed.hostname or (hosts and parsed.hostname not in hosts):
        return None
    return value


def _load_catalogue() -> None:
    global _CATALOGUE_TRACKS, _CATALOGUE_RESOURCES, _CATALOGUE_ERROR, _CATALOGUE_WARNINGS
    try:
        catalogue = json.loads(_CATALOGUE_PATH.read_text(encoding="utf-8"))
        if not isinstance(catalogue, dict) or not isinstance(catalogue.get("tracks"), dict) or not isinstance(catalogue.get("resourcesBySkill"), dict):
            raise ValueError("expected tracks and resourcesBySkill objects")
        resources = {}
        for raw_name, raw in catalogue["resourcesBySkill"].items():
            canonical = normalize_term(raw_name)
            if not is_known_skill(canonical) or not isinstance(raw, dict):
                _LOGGER.warning("Ignoring malformed resources for catalogue skill %s", raw_name)
                continue
            docs = raw.get("officialDocumentationUrls") if isinstance(raw.get("officialDocumentationUrls"), list) else []
            docs = [value for doc in docs if (value := _valid_https_url(doc))]
            videos = []
            for video in raw.get("youtube", []) if isinstance(raw.get("youtube", []), list) else []:
                if not isinstance(video, dict):
                    continue
                video_id = video.get("videoId")
                url = _valid_https_url(video.get("url"), {"youtube.com", "www.youtube.com", "youtu.be"})
                thumbnail = _valid_https_url(video.get("thumbnailUrl"), {"i.ytimg.com"})
                if not isinstance(video.get("title"), str) or not video["title"].strip() or not isinstance(video_id, str) or not _VIDEO_ID.fullmatch(video_id) or not url or not thumbnail:
                    _LOGGER.warning("Ignoring invalid video resource for catalogue skill %s", raw_name)
                    continue
                views = video.get("viewsAtResearch")
                if views is not None and (not isinstance(views, int) or isinstance(views, bool) or views < 0):
                    views = None
                basis = video.get("selectionBasis")
                videos.append({"title": video["title"].strip(), "channel": str(video.get("channel") or "").strip(),
                               "videoId": video_id, "url": url, "thumbnailUrl": thumbnail,
                               "viewsAtResearch": views, "selectionBasis": basis if basis in {"high_view_verified", "curated_relevant"} else "curated_relevant"})
            resources[canonical] = {"officialDocumentationUrls": docs, "officialDocumentationUrl": docs[0] if docs else None,
                                    "youtube": videos, "youtubeSearchUrl": _valid_https_url(raw.get("youtubeSearchUrl"), {"youtube.com", "www.youtube.com"})}
        tracks, warnings = {}, []
        for track_id, raw_track in catalogue["tracks"].items():
            if not isinstance(raw_track, dict) or not isinstance(raw_track.get("name"), str):
                warnings.append(f"Malformed track {track_id!r} was omitted.")
                continue
            nodes, seen = [], set()
            for raw_item in raw_track.get("skills", []) if isinstance(raw_track.get("skills"), list) else []:
                if not isinstance(raw_item, dict) or not isinstance(raw_item.get("skill"), str):
                    warnings.append(f"Malformed skill in {raw_track['name']} was omitted.")
                    continue
                canonical = normalize_term(raw_item["skill"])
                if not canonical or not is_known_skill(canonical):
                    warnings.append(f"Unmapped skill {raw_item['skill']!r} in {raw_track['name']} was omitted.")
                    continue
                if canonical in seen:
                    warnings.append(f"Duplicate canonical skill {raw_item['skill']!r} in {raw_track['name']} was omitted.")
                    continue
                seen.add(canonical)
                raw_deps = raw_item.get("prerequisites") if isinstance(raw_item.get("prerequisites"), list) else []
                deps = []
                for value in raw_deps:
                    dep = normalize_term(value)
                    if dep and is_known_skill(dep):
                        deps.append(dep)
                    else:
                        warnings.append(f"Unmapped prerequisite {value!r} for {raw_item['skill']} was omitted.")
                nodes.append({"canonical": canonical, "skill": display_skill(canonical),
                              "stage": str(raw_item.get("stage") or "Learning Path")[:100],
                              "importance": str(raw_item.get("importance") or "core").lower(),
                              "prerequisites": sorted(set(deps)), "resources": resources.get(canonical, {})})
            if nodes:
                tracks[track_id] = {"id": track_id, "name": raw_track["name"],
                                    "description": str(raw_track.get("description") or ""), "skills": nodes}
            else:
                warnings.append(f"Track {raw_track['name']} contains no usable skills and was omitted.")
        _CATALOGUE_TRACKS, _CATALOGUE_RESOURCES = tracks, resources
        _CATALOGUE_WARNINGS, _CATALOGUE_ERROR = warnings, None
    except (OSError, json.JSONDecodeError, ValueError) as error:
        _CATALOGUE_TRACKS, _CATALOGUE_RESOURCES = {}, {}
        _CATALOGUE_WARNINGS = []
        _CATALOGUE_ERROR = f"The roadmap catalogue could not be loaded: {error}."
        _LOGGER.exception(_CATALOGUE_ERROR)


_load_catalogue()


def get_catalogue_tracks() -> List[Dict[str, Any]]:
    if _CATALOGUE_ERROR:
        raise RuntimeError(_CATALOGUE_ERROR)
    return [{"id": track["id"], "name": track["name"], "description": track["description"], "skillCount": len(track["skills"])}
            for track in _CATALOGUE_TRACKS.values()]


def _find_catalogue_track(target: Any) -> Optional[Dict[str, Any]]:
    if not isinstance(target, str):
        return None
    value = target.strip().casefold()
    return next((track for key, track in _CATALOGUE_TRACKS.items() if value in {key.casefold(), track["name"].casefold()}), None)


def catalogue_track_exists(target: Any) -> bool:
    return _find_catalogue_track(target) is not None

LEARNING_GUIDANCE = {
    "cuda": "Review kernel launch dimensions, thread and block indexing, device memory access, and host/device synchronization.",
    "python": "Review Python syntax, data structures, functions, and error handling relevant to the selected requirements.",
    "numpy": "Review NumPy arrays, shapes, broadcasting, and vectorized operations.",
    "pandas": "Review DataFrame selection, missing-data handling, joins, and grouped summaries.",
    "machine learning": "Review supervised learning, train/validation splits, leakage, baselines, and evaluation metrics.",
    "deep learning": "Review neural-network layers, loss functions, optimization, and generalization.",
    "pytorch": "Review tensors, autograd, modules, data loaders, and training loops.",
    "tensorflow": "Review tensors, Keras models, gradient-based training, and evaluation.",
    "javascript": "Review functions, modules, promises, browser APIs, and error handling.",
    "react": "Review component state, props, effects, rendering, and accessibility.",
    "node.js": "Review the event loop, asynchronous I/O, modules, and process-level error handling.",
    "docker": "Review images, containers, Dockerfiles, networking, and persistent volumes.",
    "kubernetes": "Review pods, deployments, services, probes, and rollout behavior.",
    "terraform": "Review providers, resources, state, plans, and variable handling.",
    "sql": "Review relational modeling, joins, grouping, constraints, and query plans.",
    "postgresql": "Review schemas, constraints, indexes, transactions, and PostgreSQL query behavior.",
    "linux": "Review shell navigation, permissions, processes, pipes, and service inspection.",
    "networking": "Review addressing, DNS, ports, transport protocols, and request flow.",
    "wireshark": "Review capture filters, display filters, protocol layers, and packet fields.",
    "cryptography": "Review hashing, symmetric encryption, public-key operations, and safe library use.",
}

PRACTICE_TASKS = {
    "cuda": "Implement a CUDA vector-add kernel and compare its output with a CPU implementation for zero, small, and non-multiple block sizes.",
    "python": "Implement a small utility for the selected target with input validation, a clear error path, and three focused tests.",
    "numpy": "Implement a vectorized calculation over a sample array and compare it with a simple reference loop.",
    "pandas": "Load a small dataset, handle missing values, and produce a grouped summary checked against known rows.",
    "machine learning": "Train a baseline model on a documented split and compare its metric with a simple baseline.",
    "deep learning": "Train a small neural network on a fixed sample and record loss and held-out evaluation results.",
    "pytorch": "Implement a small PyTorch training loop with a fixed seed and inspect tensor shapes at each stage.",
    "tensorflow": "Implement a small TensorFlow model and verify its output shape and held-out metric.",
    "javascript": "Implement a target-related function with an invalid-input case and automated checks.",
    "react": "Build a target-related component with loading and empty states, then test one interaction.",
    "docker": "Containerize the selected project and run its documented health check from a clean image build.",
    "kubernetes": "Deploy a container with a readiness probe and verify a rollout after changing its image tag.",
    "terraform": "Write a minimal configuration for one target resource and review the plan before any apply.",
    "sql": "Write a join, an aggregate, and a window query against a small seeded dataset and check expected rows.",
    "linux": "Write a repeatable shell task using files, processes, permissions, and captured command output.",
    "networking": "Trace a sample client request and record its DNS lookup, destination port, and transport protocol.",
    "wireshark": "Capture a local sample exchange and use a display filter to identify its protocol fields.",
}


def _empty_roadmap(status: str, reason: str, career: Optional[str] = None) -> Dict[str, Any]:
    return {
        "status": status, "career": career, "careerId": None,
        "confirmedSkills": [], "careerRequirements": [], "jobRequirements": [],
        "prioritizedGaps": [], "stages": [], "phases": [], "roadmapItems": [],
        "priorityRanking": [], "dependencyOrder": [], "dependencyGraph": [],
        "completion": {"completedItems": 0, "totalItems": 0, "percent": None},
        "nextBestAction": None, "warnings": [reason],
        "readinessContext": reason,
        "resourcePolicy": "Resources are resolved from the shared canonical skill catalogue; missing videos use the supplied search URL without fabricated view counts.",
    }


def _confirmed_levels(profile: Mapping[str, Any]) -> Dict[str, Dict[str, Any]]:
    result: Dict[str, Dict[str, Any]] = {}
    raw_skills = profile.get("skills") if isinstance(profile.get("skills"), list) else []
    level_map = profile.get("skillLevels") if isinstance(profile.get("skillLevels"), Mapping) else {}
    for raw in raw_skills:
        if isinstance(raw, str):
            canonical, level, source = normalize_term(raw), "advanced", "manual"
        elif isinstance(raw, Mapping):
            if raw.get("confirmed") is False:
                continue
            canonical = normalize_term(raw.get("canonicalName") or raw.get("canonical") or raw.get("name") or raw.get("display") or raw.get("skill"))
            level = str(raw.get("level") or raw.get("proficiency") or raw.get("status") or level_map.get(canonical, "familiar")).strip().lower()
            sources = raw.get("sources") if isinstance(raw.get("sources"), list) else [raw.get("source")]
            source = "resume" if "resume" in sources else "manual"
        else:
            continue
        if not canonical:
            continue
        rank = LEVEL_RANK.get(level, 1)
        current = result.get(canonical)
        if current is None or rank > current["rank"]:
            result[canonical] = {"canonical": canonical, "display": display_skill(canonical), "level": level, "rank": rank, "source": source}
    return result


def _goal_requirements(profile: Mapping[str, Any]) -> Tuple[List[Dict[str, Any]], Dict[str, Dict[str, Any]]]:
    raw_goals = profile.get("skillGoals") if isinstance(profile.get("skillGoals"), list) else []
    requirements = []
    goals = {}
    importance_for = {"high": "high", "medium": "medium", "low": "low"}
    for goal in raw_goals[:100]:
        if not isinstance(goal, Mapping):
            continue
        canonical = normalize_term(goal.get("canonicalSkill") or goal.get("canonical") or goal.get("skill") or goal.get("name") or goal.get("display"))
        if not canonical:
            continue
        target = str(goal.get("targetLevel") or goal.get("desiredLevel") or "intermediate").strip().lower()
        current = str(goal.get("currentLevel") or "beginner").strip().lower()
        priority = str(goal.get("priority") or "medium").lower()
        if priority not in importance_for:
            priority = "medium"
        record = {"canonical": canonical, "targetLevel": target, "currentLevel": current, "priority": priority}
        goals[canonical] = record
        requirements.append({
            "canonicalName": canonical, "source": "manual", "importance": importance_for[priority],
            "weight": {"high": 3.0, "medium": 2.0, "low": 1.0}[priority],
            "critical": False, "evidence": [f"Student-selected goal: {display_skill(canonical)} ({current} to {target})."],
            "prerequisites": SKILL_DEPENDENCIES.get(canonical, []),
        })
    return requirements, goals


def _progress_record(progress: Mapping[str, Any], item_id: str) -> Dict[str, str]:
    raw = progress.get(item_id) if isinstance(progress, Mapping) else None
    raw = raw if isinstance(raw, Mapping) else {}
    return {key: raw.get(key) if isinstance(raw.get(key), str) and raw.get(key) in STEP_STATES else "not_started"
            for key in ("learningStatus", "practiceStatus", "verificationStatus")}


def _overall_status(state: Mapping[str, str]) -> str:
    if state["verificationStatus"] == "completed":
        return "completed"
    if state["verificationStatus"] != "not_started":
        return "verification"
    if state["practiceStatus"] != "not_started":
        return "practice"
    if state["learningStatus"] != "not_started":
        return "learning"
    return "not_started"


def generate_personalized_roadmap(profile: Any, selected_career: Any = None) -> Dict[str, Any]:
    """Compose one roadmap from confirmed skills and explicit target requirements."""
    if not isinstance(profile, Mapping):
        return _empty_roadmap("invalid_input", "A profile object is required to build a roadmap.")

    career_goal = profile.get("careerGoal") if isinstance(profile.get("careerGoal"), Mapping) else {}
    target = selected_career or profile.get("targetCareer") or career_goal.get("role")
    career_entry = next(((title, data) for title, data in CAREER_ONTOLOGY.items() if target in (title, data["id"])), None)
    catalogue_track = _find_catalogue_track(target)
    if target and career_entry is None and catalogue_track is None:
        reason = _CATALOGUE_ERROR or f"The selected career '{target}' is not in the career ontology or roadmap catalogue."
        return _empty_roadmap("catalogue_unavailable" if _CATALOGUE_ERROR else "invalid_goal", reason)
    career_gap = analyze_skill_gap(profile, career_entry[1]["id"]) if career_entry else None
    track_nodes = catalogue_track["skills"] if catalogue_track else []
    track_nodes_by_skill = {item["canonical"]: item for item in track_nodes}
    def dependencies_for(skill):
        if skill in track_nodes_by_skill:
            return list(track_nodes_by_skill[skill]["prerequisites"])
        return sorted({normalize_term(dep) for dep in SKILL_DEPENDENCIES.get(skill, []) if normalize_term(dep)})
    career_requirements = ([{"canonicalName": item["canonical"], "source": "career", "importance": "high", "weight": 3.0,
                             "critical": item["importance"] == "core", "evidence": [f"{item['stage']} requirement in the {catalogue_track['name']} roadmap catalogue."],
                             "prerequisites": item["prerequisites"]} for item in track_nodes]
                           if catalogue_track else career_gap["requirements"] if career_gap else [])
    latest_job = profile.get("latestJobMatch") if isinstance(profile.get("latestJobMatch"), Mapping) else {}
    job_requirements = latest_job.get("requirements") if isinstance(latest_job.get("requirements"), list) else []
    normalized_job = []
    for item in job_requirements[:100]:
        if not isinstance(item, Mapping):
            continue
        normalized_job.append({
            "canonicalName": item.get("canonicalName") or item.get("canonical") or item.get("display"),
            "source": "job", "importance": item.get("importance") or "medium",
            "weight": item.get("weight", 2 if item.get("importance") == "high" else 1),
            "evidence": item.get("evidence") or [],
            "prerequisites": dependencies_for(normalize_term(item.get("canonicalName") or item.get("canonical") or item.get("display"))),
        })
    goal_requirements, goals = _goal_requirements(profile)
    all_requirements = career_requirements + normalized_job + goal_requirements
    if not all_requirements:
        if career_entry or latest_job.get("summary"):
            return _empty_roadmap("complete_or_no_gaps", "The selected target has no recognized unresolved requirements to place on a roadmap.", career_entry[0] if career_entry else None)
        return _empty_roadmap("needs_goal", "Choose a career, add a student-selected skill goal, or analyze a job description first.")

    comparison = compare_requirements(all_requirements, profile)
    confirmed = _confirmed_levels(profile)
    progress = profile.get("roadmapProgress") if isinstance(profile.get("roadmapProgress"), Mapping) else {}
    direct: Dict[str, Dict[str, Any]] = {}
    for requirement in comparison["requirements"]:
        skill = requirement["canonicalName"]
        goal = goals.get(skill)
        known = confirmed.get(skill)
        target_rank = LEVEL_RANK.get(goal["targetLevel"], 2) if goal else None
        target_not_met = bool(goal and (known is None or known["rank"] < target_rank))
        if requirement["status"] == "matched" and not target_not_met:
            continue
        status = requirement["status"]
        if target_not_met and goal:
            status = "developing" if (known is not None or LEVEL_RANK.get(goal["currentLevel"], 0) > 0) else "missing"
        priority = "critical" if requirement.get("critical") and status != "matched" else (requirement.get("priority") or "medium")
        if goal and target_not_met and not requirement.get("critical"):
            priority = goal["priority"]
        direct[skill] = {
            "canonical": skill, "display": requirement["displayName"], "status": status,
            "priority": priority, "priorityScore": requirement.get("priorityScore") or 0,
            "importance": requirement["importance"], "sources": requirement["sources"],
            "reason": (f"Your selected goal is {display_skill(skill)} at {goal['currentLevel']} with a target of {goal['targetLevel']}." if target_not_met and goal
                       else requirement["reason"]),
            "requirementEvidence": requirement["evidence"],
            "prerequisites": dependencies_for(skill),
            "isGoal": bool(goal), "targetLevel": goal["targetLevel"] if goal else None,
            "stageName": track_nodes_by_skill.get(skill, {}).get("stage") or ("Job-specific requirements" if "job" in requirement["sources"] else "Your skill goals"),
        }

    # Close unmet target gaps over explicit prerequisite edges only. Already
    # confirmed intermediate-or-higher skills are context, not active tasks.
    active = dict(direct)
    pending = list(sorted(direct))
    while pending:
        dependent = pending.pop(0)
        child = active[dependent]
        for prerequisite in child["prerequisites"]:
            known = confirmed.get(prerequisite)
            if known and known["rank"] >= 2:
                continue
            if prerequisite in active:
                continue
            downstream_priority = child["priority"]
            active[prerequisite] = {
                "canonical": prerequisite, "display": display_skill(prerequisite),
                "status": "developing" if known else "missing", "priority": downstream_priority,
                "priorityScore": child["priorityScore"], "importance": child["importance"],
                "sources": ["dependency"],
                "reason": f"{display_skill(prerequisite)} is an explicit prerequisite for {child['display']}, which is a prioritized gap.",
                "requirementEvidence": [],
                "prerequisites": dependencies_for(prerequisite),
                "isGoal": False, "targetLevel": None,
                "stageName": track_nodes_by_skill.get(prerequisite, {}).get("stage") or child["stageName"],
            }
            pending.append(prerequisite)
            pending.sort()
        for prerequisite in child["prerequisites"]:
            if prerequisite in active:
                active[dependent].setdefault("unresolvedPrerequisites", []).append(prerequisite)

    graph = []
    for dependent in sorted(active):
        for prerequisite in active[dependent]["prerequisites"]:
            graph.append({"prerequisite": prerequisite, "dependent": dependent, "relationship": "prerequisite"})
    graph.sort(key=lambda edge: (edge["prerequisite"], edge["dependent"]))

    # Stable Kahn layers ensure prerequisite-before-dependent learning order.
    active_names = set(active)
    dependencies = {name: {dep for dep in active[name]["prerequisites"] if dep in active_names} for name in active_names}
    pending_names = set(active_names)
    layers: List[List[str]] = []
    while pending_names:
        ready = sorted(name for name in pending_names if not (dependencies[name] & pending_names))
        if not ready:
            return _empty_roadmap("invalid_dependency_graph", "The configured prerequisite graph contains a cycle; no roadmap order was returned.", catalogue_track["name"] if catalogue_track else career_entry[0] if career_entry else None)
        layers.append(ready)
        pending_names.difference_update(ready)

    job_summary = latest_job.get("summary") if isinstance(latest_job.get("summary"), Mapping) else {}
    target_label = catalogue_track["name"] if catalogue_track else career_entry[0] if career_entry else job_summary.get("title")
    target_label = target_label or ("career and job requirements" if career_entry and normalized_job else "job requirements" if normalized_job else "student-selected goals")
    experience_level = str(profile.get("experienceLevel") or profile.get("experience_level") or "not specified").strip().lower()
    if experience_level in {"experienced", "senior", "3+ years", "professional"}:
        project_approach = "Include operational checks, failure handling, and review notes."
    elif experience_level in {"intermediate", "1-3 years", "mid-level"}:
        project_approach = "Integrate the stage skills into an existing project slice and verify the integration."
    else:
        project_approach = "Build a small standalone example, document setup, and record repeatable checks."
    flat_order = [name for layer in layers for name in layer]
    if catalogue_track:
        catalogue_stage_order = list(dict.fromkeys(item["stage"] for item in track_nodes))
        extra_stages = [active[name]["stageName"] for name in flat_order if active[name]["stageName"] not in catalogue_stage_order]
        stage_names = catalogue_stage_order + list(dict.fromkeys(extra_stages))
        topo_rank = {name: index for index, layer in enumerate(layers) for name in layer}
        flat_order.sort(key=lambda name: (stage_names.index(active[name]["stageName"]), topo_rank.get(name, 0), PRIORITY_RANK.get(active[name]["priority"], 2), -active[name]["priorityScore"], active[name]["display"].casefold()))
        stage_for = {name: stage_names.index(active[name]["stageName"]) + 1 for name in active}
    else:
        stage_names = []
        stage_for = {name: index + 1 for index, layer in enumerate(layers) for name in layer}

    items: Dict[str, Dict[str, Any]] = {}
    for skill in flat_order:
        gap = active[skill]
        roadmap_target_id = catalogue_track["id"] if catalogue_track else career_entry[1]["id"] if career_entry else "no-career"
        identifier = "roadmap:" + ":".join([roadmap_target_id, normalize_term(target_label), skill])
        state = _progress_record(progress, identifier)
        related = [active[dep]["display"] if dep in active else confirmed[dep]["display"]
                   for dep in gap["prerequisites"] if dep in active or dep in confirmed]
        if catalogue_track:
            learning_text = LEARNING_GUIDANCE.get(skill, "")
            practice_text = PRACTICE_TASKS.get(skill, "")
            verification_text = SKILL_VERIFICATION.get(skill, "")
        else:
            learning_text = LEARNING_GUIDANCE.get(skill, f"Review the core concepts and documented APIs for {gap['display']} that relate to {target_label}.")
            practice_text = PRACTICE_TASKS.get(skill, f"Build or solve a focused {gap['display']} exercise connected to {target_label}; record the inputs and expected result.")
            verification_text = SKILL_VERIFICATION.get(skill, f"Demonstrate {gap['display']} in a small task and record an observable check of the expected behavior.")
        item_status = _overall_status(state)
        resources = track_nodes_by_skill.get(skill, {}).get("resources", _CATALOGUE_RESOURCES.get(skill, {}))
        items[skill] = {
            "id": identifier, "skill": gap["display"], "canonicalSkill": skill,
            "stage": stage_for[skill], "priority": gap["priority"], "priorityScore": gap["priorityScore"],
            "sources": gap["sources"], "reason": gap["reason"], "importance": gap["importance"],
            "requirementEvidence": gap["requirementEvidence"],
            "prerequisites": [display_skill(dep) for dep in gap["prerequisites"]],
            "prerequisiteDetails": [{"canonicalSkill": dep, "skill": display_skill(dep),
                                     "status": "active_gap" if dep in active else "confirmed" if dep in confirmed else "unresolved",
                                     "confirmed": dep in confirmed and dep not in active}
                                    for dep in gap["prerequisites"]],
            "relatedPrerequisites": related, "currentStatus": gap["status"], "status": item_status,
            "learning": {"title": f"Learn {gap['display']}", "guidance": learning_text, "status": state["learningStatus"]},
            "practice": {"title": f"Practice {gap['display']}", "task": practice_text, "status": state["practiceStatus"]},
            "verification": {"title": f"Verify {gap['display']}", "task": verification_text, "status": state["verificationStatus"]},
            "resources": [], "targetLevel": gap["targetLevel"],
            "stageName": gap.get("stageName"),
            "officialDocumentationUrl": resources.get("officialDocumentationUrl"),
            "officialDocumentationUrls": resources.get("officialDocumentationUrls", []),
            "youtube": resources.get("youtube", []), "youtubeSearchUrl": resources.get("youtubeSearchUrl"),
            "isJobSpecific": "job" in gap["sources"] and skill not in track_nodes_by_skill,
            "isGoal": gap["isGoal"],
        }

    stages = []
    if catalogue_track:
        grouped = {name: [] for name in stage_names}
        for skill in flat_order:
            grouped.setdefault(active[skill]["stageName"], []).append(items[skill])
        completed_by_stage = {name: [] for name in stage_names}
        for requirement in comparison["requirements"]:
            skill = requirement["canonicalName"]
            if skill in active or requirement["status"] != "matched":
                continue
            node = track_nodes_by_skill.get(skill)
            stage_name = node["stage"] if node else ("Job-specific requirements" if "job" in requirement["sources"] else "Your skill goals")
            completed_by_stage.setdefault(stage_name, []).append({"skill": requirement["displayName"], "canonicalSkill": skill, "status": "confirmed"})
        for node in track_nodes:
            stage_name = node["stage"]
            if node["canonical"] not in active and node["canonical"] not in {item["canonicalSkill"] for item in completed_by_stage.get(stage_name, [])}:
                requirement = next((item for item in comparison["requirements"] if item["canonicalName"] == node["canonical"]), None)
                if requirement and requirement["status"] == "developing":
                    continue
        for index, stage_name in enumerate(stage_names, 1):
            stage_items = grouped.get(stage_name, [])
            completed = sorted(completed_by_stage.get(stage_name, []), key=lambda item: item["skill"].casefold())
            count = len(completed) + sum(item["status"] == "completed" for item in stage_items)
            total = len(completed) + len(stage_items)
            completion_state = "completed" if total and count == total else "in_progress" if count else "not_started"
            stages.append({"stage": index, "phase": index, "title": stage_name, "stageName": stage_name,
                           "description": catalogue_track["description"], "skills": stage_items,
                           "completedSkills": completed, "completed": count, "total": total,
                           "completionState": completion_state, "projectMilestone": None})
    else:
        for index, layer in enumerate(layers, 1):
            stage_items = [items[skill] for skill in sorted(layer, key=lambda name: (PRIORITY_RANK.get(active[name]["priority"], 2), -active[name]["priorityScore"], active[name]["display"].casefold()))]
            names = [item["skill"] for item in stage_items]
            stage_statuses = [item["status"] for item in stage_items]
            completion_state = "completed" if stage_items and all(status == "completed" for status in stage_statuses) else "in_progress" if any(status != "not_started" for status in stage_statuses) else "not_started"
            title = f"Stage {index}: {', '.join(names)}" if len(layers) == 1 else f"Stage {index}: {'Foundations' if index == 1 else 'Applied skills' if index == len(layers) else 'Core skills'}"
            stages.append({"stage": index, "phase": index, "title": title,
                           "description": f"These skills have no unresolved roadmap prerequisites. Work on them before later dependent stages for {target_label}.",
                           "skills": stage_items, "completedSkills": [], "completionState": completion_state,
                           "projectMilestone": {"title": f"{target_label} checkpoint: {', '.join(names)}",
                                                "objective": f"Demonstrate the stage skills in one project slice related to {target_label}. {project_approach}",
                                                "deliverables": [f"Working example using {name}" for name in names] + ["Setup and evidence notes", "Recorded verification results"]}})

    priority_ranking = sorted(items.values(), key=lambda item: (PRIORITY_RANK.get(item["priority"], 2), -item["priorityScore"], item["skill"].casefold()))
    prioritized_gaps = [{
        "canonicalName": item["canonicalSkill"], "displayName": item["skill"],
        "status": item["currentStatus"], "priority": item["priority"],
        "priorityScore": item["priorityScore"], "reason": item["reason"],
        "sources": item["sources"], "stage": item["stage"],
    } for item in priority_ranking]
    verified_skills = {name for name, item in items.items() if item["status"] == "completed"}
    confirmed_requirements = {item["canonicalName"] for item in comparison["requirements"] if item["status"] == "matched" and item["canonicalName"] not in active}
    completed_count = len(verified_skills | confirmed_requirements)
    total_count = len({item["canonicalName"] for item in comparison["requirements"]} | set(active))
    if not catalogue_track and not items:
        completed_count = total_count = 0
    next_action = None
    for stage in stages:
        for item in stage["skills"]:
            if item["status"] == "completed":
                continue
            step = next((name for name in ("learning", "practice", "verification") if item[name]["status"] != "completed"), "verification")
            next_action = {"itemId": item["id"], "skill": item["skill"], "canonicalSkill": item["canonicalSkill"],
                           "step": step, "reason": item["reason"], "priority": item["priority"],
                           "unblocks": sorted(display_skill(edge["dependent"]) for edge in graph if edge["prerequisite"] == item["canonicalSkill"])}
            break
        if next_action:
            break

    warnings = list(_CATALOGUE_WARNINGS) if catalogue_track else []
    if not confirmed:
        warnings.append("No confirmed skills are recorded; the roadmap starts from the supplied career, job, or student goals.")
    readiness_context = "Confirmed skills are treated as the current baseline. Unconfirmed or rejected resume candidates are excluded. Learn and practice progress does not mark a profile skill mastered; only a recorded verification marks a roadmap item complete."
    details = []
    for requirement in comparison["requirements"]:
        item = active.get(requirement["canonicalName"])
        status = item["status"] if item else requirement["status"]
        details.append({**requirement, "skill": requirement["displayName"], "matchStatus": status,
                        "status": "critical_missing" if status == "missing" and requirement.get("critical") else status})
    gap_items = [item for item in details if item["matchStatus"] != "matched"]
    gap_analysis = {"career": catalogue_track["name"] if catalogue_track else career_entry[0] if career_entry else None,
                    "careerId": catalogue_track["id"] if catalogue_track else career_entry[1]["id"] if career_entry else None,
                    "readinessScore": comparison["coverageScore"],
                    "masteredSkills": [item["skill"] for item in details if item["matchStatus"] == "matched"],
                    "developingSkills": [item["skill"] for item in details if item["matchStatus"] == "developing"],
                    "missingSkills": [item["skill"] for item in details if item["matchStatus"] == "missing" and not item.get("critical")],
                    "criticalMissingSkills": [item["skill"] for item in details if item["matchStatus"] == "missing" and item.get("critical")],
                    "recommendedSkills": [item["skill"] for item in gap_items], "skillDetails": details,
                    "requirements": comparison["requirements"], "prioritizedGaps": gap_items,
                    "readinessMethod": comparison["scoreFormula"], "priorityMethod": comparison["priorityFormula"]}
    return {
        "status": "ready" if items or catalogue_track else "complete_or_no_gaps",
        "career": catalogue_track["name"] if catalogue_track else career_entry[0] if career_entry else None,
        "careerId": catalogue_track["id"] if catalogue_track else career_entry[1]["id"] if career_entry else None,
        "catalogueTrackId": catalogue_track["id"] if catalogue_track else None, "target": target_label,
        "experienceLevel": experience_level,
        "confirmedSkills": [confirmed[key] for key in sorted(confirmed)],
        "careerRequirements": career_requirements,
        "jobRequirements": [item for item in comparison["requirements"] if "job" in item["sources"]],
        "prioritizedGaps": prioritized_gaps, "stages": stages, "phases": stages,
        "roadmapItems": [items[name] for name in flat_order], "priorityRanking": priority_ranking,
        "dependencyOrder": [display_skill(name) for name in flat_order], "dependencyGraph": graph,
        "completion": {"completedItems": completed_count, "totalItems": total_count,
                       "percent": round(completed_count * 100 / total_count) if total_count else None},
        "nextBestAction": next_action, "warnings": warnings,
        "readinessContext": readiness_context + " The roadmap does not guarantee employment.",
        "resourcePolicy": "Resources are resolved from the shared canonical skill catalogue; missing videos use its search link without fabricated popularity claims.",
        "priorityFormula": comparison["priorityFormula"], "skillGapAnalysis": gap_analysis,
        "learningOrderMethod": "Stable topological layers from explicitly configured prerequisite edges; priority only orders items within a layer and cannot bypass prerequisites.",
    }


def generate_goal_roadmap(profile: Any) -> Dict[str, Any]:
    """Backward-compatible entry point for /api/roadmap/skills."""
    return generate_personalized_roadmap(profile)


if __name__ == "__main__":
    import argparse
    import json
    import sys
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--input", required=True)
    args = parser.parse_args()
    try:
        with open(args.input, "r", encoding="utf-8") as source:
            result = generate_goal_roadmap(json.load(source))
        print(json.dumps(result, ensure_ascii=False))
    except (OSError, json.JSONDecodeError, ValueError) as error:
        print(json.dumps({"error": str(error)}, ensure_ascii=False), file=sys.stderr)
        raise SystemExit(2)
