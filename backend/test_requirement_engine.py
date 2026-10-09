"""Deterministic career and job requirement matching contract tests."""

import unittest

from job_matcher import analyze_job_description
from ml_engine import analyze_skill_gap, generate_learning_roadmap
from requirement_engine import compare_requirements, normalize_requirements
from skill_normalizer import normalize_term


class RequirementEngineTests(unittest.TestCase):
    def test_confirmed_skill_matches(self):
        result = compare_requirements([{"skill": "Python", "source": "manual"}], {"skills": [{"canonical": "python", "confirmed": True, "level": "advanced"}]})
        self.assertEqual(result["requirements"][0]["status"], "matched")

    def test_unconfirmed_candidate_does_not_satisfy_requirement(self):
        result = compare_requirements([{"skill": "PyTorch"}], {"skills": [{"canonical": "pytorch", "confirmed": False}]})
        self.assertEqual(result["requirements"][0]["status"], "missing")

    def test_missing_requirement_classification(self):
        result = compare_requirements([{"skill": "CUDA"}], {"skills": []})
        self.assertEqual(result["requirements"][0]["status"], "missing")

    def test_developing_profile_level_is_partial(self):
        result = compare_requirements([{"skill": "Docker"}], {"skills": [{"canonical": "docker", "confirmed": True, "level": "beginner"}]})
        self.assertEqual(result["requirements"][0]["status"], "developing")
        self.assertEqual(result["coverageScore"], 50.0)

    def test_ontology_aliases_normalize(self):
        result = compare_requirements([{"skill": "py"}], {"skills": ["python"]})
        self.assertEqual(result["requirements"][0]["canonicalName"], "python")
        self.assertEqual(normalize_term("nodejs"), "node.js")

    def test_duplicate_requirements_merge_evidence_and_weight(self):
        result = normalize_requirements([
            {"skill": "NodeJS", "source": "job", "importance": "low", "evidence": "preferred"},
            {"skill": "Node.js", "source": "job", "importance": "high", "evidence": "required"},
        ])
        self.assertEqual(len(result), 1)
        self.assertEqual(result[0]["importance"], "high")
        self.assertEqual(len(result[0]["evidence"]), 2)

    def test_career_requirements_compare_against_confirmed_profile(self):
        result = analyze_skill_gap({"skills": ["Python"]}, "ai-ml-engineer")
        python = next(item for item in result["requirements"] if item["canonicalName"] == "python")
        self.assertEqual(python["source"], "career")
        self.assertEqual(python["status"], "matched")

    def test_job_description_requirements_compare_through_same_engine(self):
        result = analyze_job_description({"skills": ["Python"]}, "Role requires Python and PyTorch for training models.")
        self.assertEqual(next(item for item in result["requirements"] if item["canonical"] == "python")["status"], "matched")
        self.assertEqual(next(item for item in result["requirements"] if item["canonical"] == "pytorch")["status"], "missing")

    def test_explanation_uses_confirmed_evidence_language(self):
        result = compare_requirements([{"skill": "CUDA"}], {"skills": []})
        self.assertEqual(result["requirements"][0]["reason"], "No confirmed evidence for CUDA was found in your profile.")

    def test_priority_uses_importance_and_dependency_order(self):
        result = compare_requirements([
            {"skill": "Python", "importance": "high", "prerequisites": []},
            {"skill": "PyTorch", "importance": "high", "prerequisites": ["Python"]},
        ], {"skills": []})
        self.assertEqual(result["prioritizedGaps"][0]["canonicalName"], "python")
        self.assertIn("priorityFormula", result)

    def test_career_and_job_sources_are_not_collapsed(self):
        career = analyze_skill_gap({}, "ai-ml-engineer")
        job = analyze_job_description({}, "Role requires Python, CUDA and Docker for model deployment.")
        self.assertTrue(all(item["source"] == "career" for item in career["requirements"]))
        self.assertTrue(all(item["source"] == "job" for item in job["requirements"]))

    def test_no_resume_profile_still_gets_career_gaps(self):
        result = analyze_skill_gap({"skills": ["Python", "C++"]}, "ai-ml-engineer")
        self.assertIn("PyTorch", result["criticalMissingSkills"])

    def test_manual_confirmed_skills_are_accepted(self):
        result = analyze_job_description({"skills": [{"canonical": "python", "source": "manual", "confirmed": True, "level": "advanced"}]}, "Role requires Python and Docker skills.")
        self.assertIn("python", {item["canonical"] for item in result["skillsYouHave"]})

    def test_resume_derived_confirmed_skill_is_accepted(self):
        result = analyze_job_description({"skills": [{"canonical": "pytorch", "source": "resume", "confirmed": True, "level": "advanced", "evidence": "Project evidence"}]}, "Role requires PyTorch for model training.")
        self.assertEqual(result["requirements"][0]["status"], "matched")
        self.assertIn("Project evidence", result["requirements"][0]["profileEvidence"])

    def test_rejected_or_unconfirmed_skill_is_not_accepted(self):
        result = analyze_job_description({"skills": [{"canonical": "cuda", "source": "resume", "confirmed": False}], "resumeCandidates": [{"canonical": "python", "status": "rejected"}]}, "Role requires CUDA and Python experience.")
        self.assertTrue(all(item["status"] == "missing" for item in result["requirements"]))

    def test_empty_requirement_set_has_no_fabricated_score(self):
        result = compare_requirements([], {"skills": ["Python"]})
        self.assertIsNone(result["coverageScore"])
        self.assertEqual(result["prioritizedGaps"], [])

    def test_malformed_job_description_is_rejected(self):
        with self.assertRaisesRegex(ValueError, "at least 20"):
            analyze_job_description({}, "short")

    def test_existing_job_match_response_groups_are_preserved(self):
        result = analyze_job_description({"skills": ["Python"]}, "Role requires Python. Docker is preferred.")
        self.assertEqual(result["matchedCount"], len(result["skillsYouHave"]))
        self.assertEqual(result["notFoundCount"], len(result["notFoundSkills"]))
        self.assertIn("not a hiring probability", result["methodology"])

    def test_existing_roadmap_consumes_the_shared_gap_contract(self):
        result = generate_learning_roadmap({"skills": ["Python"]}, "ai-ml-engineer")
        self.assertTrue(result["phases"])
        self.assertIn("Deep Learning", result["dependencyOrder"])

    def test_confirmed_profile_compatibility_remains_separate_from_goals(self):
        result = analyze_job_description({"skills": [], "skillGoals": [{"canonical": "cuda", "currentLevel": "advanced"}]}, "Role requires CUDA for model development.")
        self.assertEqual(result["requirements"][0]["status"], "missing")

    def test_partial_evidence_requires_explicit_ontology_relationship(self):
        result = compare_requirements([{"skill": "Deep Learning"}], {"skills": ["CNN"]})
        self.assertEqual(result["requirements"][0]["status"], "developing")
        self.assertEqual(result["requirements"][0]["relatedSkills"], ["CNN"])
        unrelated = compare_requirements([{"skill": "Machine Learning"}], {"skills": ["Python"]})
        self.assertEqual(unrelated["requirements"][0]["status"], "missing")


if __name__ == "__main__":
    unittest.main(verbosity=2)
