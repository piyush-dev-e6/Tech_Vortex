"""Deterministic contract and ranking tests for ml_engine."""

import unittest

from ml_engine import analyze_candidate, analyze_skill_gap, normalize_term


PROFILES = {
    "A": ["Python", "Machine Learning", "PyTorch", "NumPy", "Pandas"],
    "B": ["React", "JavaScript", "Node.js", "PostgreSQL"],
    "C": ["Linux", "Docker", "Kubernetes", "AWS", "Terraform"],
    "D": ["Python", "SQL", "Pandas", "Statistics", "Tableau"],
    "E": ["Networking", "Linux", "Python", "Wireshark", "Cryptography"],
    "minimal": ["Origami"],
}
EXPECTED = {
    "A": "ai-ml-engineer",
    "B": "fullstack-architect",
    "C": "devops-cloud",
    "D": "data-intelligence",
    "E": "cyber-defense",
}


class CareerMatchingTests(unittest.TestCase):
    def test_alias_normalization(self):
        aliases = {
            "py": "python", "python3": "python", "pytorch framework": "pytorch",
            "react.js": "react", "reactjs": "react", "node": "node.js",
            "nodejs": "node.js", "k8s": "kubernetes", "sklearn": "scikit-learn",
            "ml": "machine learning", "dl": "deep learning",
        }
        for source, expected in aliases.items():
            with self.subTest(source=source):
                self.assertEqual(normalize_term(source), expected)

    def test_each_profile_ranks_its_expected_role_first(self):
        for name, skills in PROFILES.items():
            if name == "minimal":
                continue
            with self.subTest(candidate=name):
                result = analyze_candidate({"skills": skills, "cgpa": 8.0})
                self.assertEqual(result["topRecommendations"][0]["id"], EXPECTED[name])

    def test_irrelevant_profile_scores_low(self):
        result = analyze_candidate({"skills": PROFILES["minimal"], "cgpa": 5.0})
        self.assertLess(result["topRecommendations"][0]["matchScore"], 30)

    def test_scores_are_weighted_and_explainable(self):
        result = analyze_candidate({"skills": PROFILES["A"], "cgpa": 8.0})
        role = result["topRecommendations"][0]
        breakdown = role["scoreBreakdown"]
        expected = round(
            breakdown["semanticSimilarity"] * 0.40
            + breakdown["coreSkillCoverage"] * 0.25
            + breakdown["projectRelevance"] * 0.15
            + breakdown["educationFit"] * 0.10
            + breakdown["interestAlignment"] * 0.10,
            2,
        )
        self.assertEqual(breakdown["overall"], expected)
        self.assertEqual(role["matchScore"], expected)
        for key in ("whyMatched", "strengths", "missingCriticalSkills", "recommendedNextSkills",
                    "possessedCoreSkills", "possessedComplementarySkills", "missingCoreSkills", "missingComplementarySkills"):
            self.assertIn(key, role)

    def test_interest_cannot_replace_missing_skills_and_no_project_is_zero(self):
        result = analyze_candidate({"skills": [], "interests": ["AI machine learning cloud data analytics"], "cgpa": 8.0})
        for role in result["topRecommendations"]:
            self.assertEqual(role["scoreBreakdown"]["coreSkillCoverage"], 0.0)
            self.assertEqual(role["scoreBreakdown"]["projectRelevance"], 0.0)

    def test_project_relevance_requires_supplied_project_details(self):
        no_project = analyze_candidate({"skills": ["Python"]})["topRecommendations"][0]
        with_project = analyze_candidate({"skills": ["Python"], "projects": [{"description": "Built a PyTorch machine learning classifier"}]})["topRecommendations"][0]
        self.assertEqual(no_project["scoreBreakdown"]["projectRelevance"], 0.0)
        self.assertGreater(with_project["scoreBreakdown"]["projectRelevance"], 0.0)

    def test_missing_education_receives_no_default_match_credit(self):
        without_education = analyze_candidate({"skills": ["Python"]})["topRecommendations"][0]
        nested_education = analyze_candidate({"skills": ["Python"], "education": {"degree": "BSc Computer Science", "cgpa": 8.0}})["topRecommendations"][0]
        self.assertEqual(without_education["scoreBreakdown"]["educationFit"], 0.0)
        self.assertGreater(nested_education["scoreBreakdown"]["educationFit"], 0.0)

    def test_project_text_is_used_when_supplied_as_a_string(self):
        result = analyze_candidate({"skills": ["Python"], "projects": "Built a PyTorch machine learning classifier"})
        ai_role = next(role for role in result["topRecommendations"] if role["id"] == "ai-ml-engineer")
        self.assertGreater(ai_role["scoreBreakdown"]["projectRelevance"], 0.0)

    def test_gap_analysis_for_multiple_careers_uses_canonical_ontology(self):
        profile = {"skills": ["react.js", "nodejs", "PostgreSQL"]}
        web = analyze_skill_gap(profile, "fullstack-architect")
        data = analyze_skill_gap(profile, "data-intelligence")
        self.assertEqual(web["career"], "Full-Stack Cloud Architect")
        self.assertEqual(set(web["masteredSkills"]), {"React", "Node.js", "PostgreSQL"})
        self.assertIn("TypeScript", web["criticalMissingSkills"])
        self.assertIn("Tableau", data["criticalMissingSkills"])
        self.assertNotEqual(web["readinessScore"], data["readinessScore"])
        self.assertAlmostEqual(web["readinessScore"], 100 * (2 * 3) / (2 * 12 + 7), places=2)

    def test_empty_skills_returns_zero_readiness_and_all_core_gaps(self):
        gap = analyze_skill_gap({"skills": []}, "devops-cloud")
        self.assertEqual(gap["readinessScore"], 0.0)
        self.assertEqual(gap["masteredSkills"], [])
        self.assertEqual(len(gap["criticalMissingSkills"]), len(gap["skillDetails"]) - 6)
        self.assertTrue(all(item["status"] in {"critical_missing", "missing"} for item in gap["skillDetails"]))

    def test_unknown_skills_are_reported_but_do_not_change_readiness(self):
        without_unknown = analyze_skill_gap({"skills": ["Python"]}, "ai-ml-engineer")
        with_unknown = analyze_skill_gap({"skills": ["Python", "Origami"]}, "ai-ml-engineer")
        self.assertEqual(with_unknown["readinessScore"], without_unknown["readinessScore"])
        self.assertEqual(with_unknown["unmatchedProfileSkills"], ["origami"])

    def test_duplicate_skills_do_not_inflate_readiness(self):
        once = analyze_skill_gap({"skills": ["Python", "Docker"]}, "ai-ml-engineer")
        repeated = analyze_skill_gap({"skills": ["Python", "Python3", "py", "Docker", "Docker"]}, "ai-ml-engineer")
        self.assertEqual(once["readinessScore"], repeated["readinessScore"])
        self.assertEqual(len(repeated["masteredSkills"]), 2)

    def test_developing_skills_receive_partial_weight_and_explanation(self):
        gap = analyze_skill_gap({"skills": [{"name": "Python", "level": "developing"}]}, "ai-ml-engineer")
        python_detail = next(item for item in gap["skillDetails"] if item["skill"] == "Python")
        self.assertEqual(python_detail["status"], "developing")
        self.assertEqual(python_detail["importance"], "high")
        self.assertIn("partial coverage", python_detail["reason"])
        self.assertIn("Python", gap["recommendedSkills"])
        self.assertAlmostEqual(gap["readinessScore"], 100 / (2 * 11 + 9), places=2)

    def test_analysis_response_includes_default_or_requested_gap(self):
        default = analyze_candidate({"skills": PROFILES["C"]})
        requested = analyze_candidate({"skills": PROFILES["C"], "targetCareer": "cyber-defense"})
        self.assertEqual(default["skillGapAnalysis"]["careerId"], "devops-cloud")
        self.assertEqual(requested["skillGapAnalysis"]["careerId"], "cyber-defense")
        self.assertIn("skillGapAnalysis", requested["topRecommendations"][0])


if __name__ == "__main__":
    unittest.main(verbosity=2)
