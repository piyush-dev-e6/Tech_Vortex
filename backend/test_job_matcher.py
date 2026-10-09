import unittest

from job_matcher import analyze_job_description


JOB = """Machine Learning Intern
Required: Python, PyTorch, and SQL.
Experience with Docker is preferred.
You will work with pandas and deploy models.
"""


class JobMatcherTests(unittest.TestCase):
    def test_extracts_only_explicit_known_skills_and_evidence(self):
        result = analyze_job_description({"skills": []}, JOB)
        names = {item["canonical"] for item in result["requirements"]}
        self.assertTrue({"python", "pytorch", "sql", "docker", "pandas"}.issubset(names))
        self.assertTrue(all(item["evidence"] for item in result["requirements"]))

    def test_confirmed_and_developing_profile_skills_are_distinguished(self):
        result = analyze_job_description({"skills": [
            {"canonical": "python", "confirmed": True},
            {"canonical": "pytorch", "confirmed": True},
            {"canonical": "sql", "confirmed": False},
            {"canonical": "docker", "confirmed": True, "level": "beginner"},
        ]}, JOB)
        statuses = {item["canonical"]: item["status"] for item in result["requirements"]}
        self.assertEqual(statuses["python"], "matched")
        self.assertEqual(statuses["pytorch"], "matched")
        self.assertEqual(statuses["sql"], "missing")
        self.assertEqual(statuses["docker"], "developing")

    def test_score_is_weighted_coverage_not_a_probability(self):
        result = analyze_job_description({"skills": [{"canonical": "python"}]}, JOB)
        self.assertLess(result["coverageScore"], 100)
        self.assertIn("not a hiring probability", result["methodology"])
        self.assertEqual(result["scoreLabel"], "weighted coverage of extracted requirements")
        self.assertIn("matched=1", result["scoreFormula"])

    def test_skill_goals_do_not_satisfy_job_requirements(self):
        result = analyze_job_description({"skills": [], "skillGoals": [{"canonical": "docker", "currentLevel": "advanced"}]}, "Role requires Docker experience and Python.")
        statuses = {item["canonical"]: item["status"] for item in result["requirements"]}
        self.assertEqual(statuses["docker"], "missing")

    def test_aliases_normalize_without_substring_false_positives(self):
        result = analyze_job_description({"skills": [{"canonical": "node.js"}]}, "Role requires NodeJS and Python programming.")
        self.assertEqual([item["canonical"] for item in result["requirements"]], ["node.js", "python"])
        no_js = analyze_job_description({}, "This project requires projects and documentation skills.")
        self.assertNotIn("javascript", {item["canonical"] for item in no_js["requirements"]})

    def test_no_supported_requirements_returns_null_score_and_warning(self):
        result = analyze_job_description({}, "This role values curiosity and collaboration above all else.")
        self.assertIsNone(result["coverageScore"])
        self.assertEqual(result["requirementCount"], 0)
        self.assertTrue(result["warnings"])
        self.assertEqual(result["readinessSimulations"], [])

    def test_missing_high_impact_requirements_are_prioritized_ahead_of_preferred_gaps(self):
        result = analyze_job_description({}, "Required: Docker.\nPreferred: AWS.")
        self.assertTrue(all(item["status"] == "missing" for item in result["requirements"]))
        self.assertEqual(result["priorityGaps"][0]["canonical"], "docker")
        self.assertEqual(result["priorityGaps"][0]["importance"], "high")

    def test_readiness_simulation_reuses_weighted_comparison_without_changing_profile(self):
        profile = {"skills": [{"canonical": "python", "confirmed": True}], "skillGoals": [{"canonical": "docker"}]}
        before = repr(profile)
        result = analyze_job_description(profile, "Required: Docker\nPreferred: AWS and Python.")
        self.assertEqual(repr(profile), before)
        self.assertTrue(result["readinessSimulations"])
        for item in result["readinessSimulations"]:
            self.assertEqual(item["currentScore"], result["coverageScore"])
            self.assertGreaterEqual(item["simulatedScore"], item["currentScore"])
        simulations = {item["canonical"]: item for item in result["readinessSimulations"]}
        self.assertGreater(simulations["docker"]["improvement"], simulations["aws"]["improvement"])

    def test_all_confirmed_requirements_have_full_readiness(self):
        extracted = analyze_job_description({"skills": []}, JOB)
        result = analyze_job_description({"skills": [
            {"canonical": item["canonical"], "confirmed": True, "level": "advanced"}
            for item in extracted["requirements"]
        ]}, JOB)
        self.assertEqual(result["coverageScore"], 100.0)
        self.assertEqual(result["priorityGaps"], [])

    def test_unconfirmed_resume_candidate_and_skill_goal_remain_uncovered(self):
        result = analyze_job_description({
            "resume": {"status": "parsed"},
            "skills": [{"canonical": "docker", "confirmed": False, "source": "resume"}],
            "skillGoals": [{"canonical": "aws", "currentLevel": "advanced"}],
        }, "Required: Docker and AWS.")
        self.assertTrue(all(item["status"] == "missing" for item in result["requirements"]))

    def test_pasted_example_extracts_expected_skills_with_sentence_evidence_and_importance(self):
        description = ("We are looking for a Machine Learning Engineer with strong Python "
                       "and PyTorch experience. The candidate should understand machine "
                       "learning algorithms, NumPy, Pandas and SQL. Experience with Docker "
                       "and AWS is preferred. Git experience is required.")
        result = analyze_job_description({}, description, "ML Engineer", "ExampleCo")
        requirements = {item["canonical"]: item for item in result["requirements"]}
        self.assertTrue({"python", "pytorch", "machine learning", "numpy", "pandas", "sql", "docker", "aws", "git"}.issubset(requirements))
        self.assertEqual(requirements["docker"]["importance"], "low")
        self.assertEqual(requirements["aws"]["importance"], "low")
        self.assertEqual(requirements["git"]["importance"], "high")
        self.assertTrue(all(item["evidence"] for item in requirements.values()))
        self.assertEqual(result["job"], {"title": "ML Engineer", "company": "ExampleCo"})

    def test_section_context_and_aliases_are_normalized(self):
        result = analyze_job_description({}, "Required Qualifications:\n- Python and scikit-learn\nPreferred Qualifications:\n- PostgreSQL and PyTorch framework")
        requirements = {item["canonical"]: item for item in result["requirements"]}
        self.assertIn("scikit-learn", requirements)
        self.assertEqual(requirements["python"]["importance"], "high")
        self.assertEqual(requirements["postgresql"]["importance"], "low")
        self.assertEqual(requirements["pytorch"]["importance"], "low")

    def test_optional_title_and_company_are_not_required(self):
        result = analyze_job_description({}, "Role requires Python, Docker and SQL.")
        self.assertIn("title", result["job"])
        self.assertNotIn("company", result["job"])

    def test_validates_description_size(self):
        with self.assertRaisesRegex(ValueError, "30,000"):
            analyze_job_description({}, "x" * 30001)


if __name__ == "__main__":
    unittest.main(verbosity=2)
