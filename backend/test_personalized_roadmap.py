"""Contract tests for deterministic, evidence-based roadmap generation."""

import unittest

from ml_engine import analyze_skill_gap, generate_learning_roadmap
from roadmap_engine import generate_personalized_roadmap
from skill_goal_roadmap import generate_goal_roadmap


class PersonalizedRoadmapTests(unittest.TestCase):
    def test_confirmed_prerequisite_is_context_not_an_active_task(self):
        roadmap = generate_learning_roadmap({"skills": ["Python", "NumPy", "Pandas", "Machine Learning", "Deep Learning"]}, "ai-ml-engineer")
        self.assertNotIn("Python", roadmap["dependencyOrder"])
        self.assertNotIn("Machine Learning", roadmap["dependencyOrder"])
        self.assertIn("PyTorch", roadmap["dependencyOrder"])

    def test_missing_prerequisite_is_added_to_the_roadmap(self):
        roadmap = generate_personalized_roadmap({"skillGoals": [{"canonical": "pytorch", "targetLevel": "intermediate", "priority": "high"}]})
        self.assertIn("Deep Learning", roadmap["dependencyOrder"])
        self.assertLess(roadmap["dependencyOrder"].index("Deep Learning"), roadmap["dependencyOrder"].index("PyTorch"))

    def test_already_known_target_is_not_an_active_learning_item(self):
        roadmap = generate_personalized_roadmap({"skillGoals": [{"canonical": "python", "targetLevel": "intermediate"}], "skills": [{"canonical": "python", "confirmed": True, "level": "advanced"}]})
        self.assertNotIn("Python", roadmap["dependencyOrder"])

    def test_dependency_order_is_topological(self):
        roadmap = generate_personalized_roadmap({"skillGoals": [{"canonical": "pytorch", "targetLevel": "intermediate"}]})
        names = roadmap["dependencyOrder"]
        self.assertLess(names.index("Python"), names.index("NumPy"))
        self.assertLess(names.index("NumPy"), names.index("Machine Learning"))
        self.assertLess(names.index("Machine Learning"), names.index("Deep Learning"))
        self.assertLess(names.index("Deep Learning"), names.index("PyTorch"))

    def test_priority_ranking_does_not_override_learning_order(self):
        roadmap = generate_personalized_roadmap({"skillGoals": [
            {"canonical": "python", "currentLevel": "beginner", "targetLevel": "intermediate", "priority": "low"},
            {"canonical": "pytorch", "currentLevel": "beginner", "targetLevel": "intermediate", "priority": "high"},
        ]})
        self.assertLess(next(index for index, item in enumerate(roadmap["priorityRanking"]) if item["skill"] == "PyTorch"),
                        next(index for index, item in enumerate(roadmap["priorityRanking"]) if item["skill"] == "Python"))
        self.assertEqual(roadmap["dependencyOrder"][0], "Python")
        self.assertGreater(next(item["stage"] for item in roadmap["priorityRanking"] if item["skill"] == "PyTorch"),
                           next(item["stage"] for item in roadmap["priorityRanking"] if item["skill"] == "Python"))

    def test_multiple_dependencies_are_preserved(self):
        roadmap = generate_personalized_roadmap({"skillGoals": [{"canonical": "next.js", "targetLevel": "intermediate"}]})
        next_item = next(item for item in roadmap["roadmapItems"] if item["canonicalSkill"] == "next.js")
        self.assertEqual(set(next_item["prerequisites"]), {"React", "JavaScript"})

    def test_dependency_edges_are_machine_readable(self):
        roadmap = generate_personalized_roadmap({"skillGoals": [{"canonical": "pytorch", "targetLevel": "intermediate"}]})
        self.assertIn({"prerequisite": "deep learning", "dependent": "pytorch", "relationship": "prerequisite"}, roadmap["dependencyGraph"])

    def test_dependency_chain_contains_only_configured_links(self):
        roadmap = generate_personalized_roadmap({"skillGoals": [{"canonical": "pytorch", "targetLevel": "intermediate"}]})
        self.assertEqual(roadmap["dependencyOrder"], ["Python", "NumPy", "Pandas", "Machine Learning", "Deep Learning", "PyTorch"])

    def test_confirmed_manual_skill_satisfies_prerequisite(self):
        roadmap = generate_personalized_roadmap({"skills": [{"canonical": "python", "source": "manual", "confirmed": True, "level": "advanced"}], "skillGoals": [{"canonical": "pytorch", "targetLevel": "intermediate"}]})
        self.assertNotIn("Python", roadmap["dependencyOrder"])

    def test_confirmed_resume_skill_satisfies_prerequisite(self):
        roadmap = generate_personalized_roadmap({"skills": [{"canonical": "python", "source": "resume", "confirmed": True, "level": "advanced"}], "skillGoals": [{"canonical": "pytorch", "targetLevel": "intermediate"}]})
        self.assertNotIn("Python", roadmap["dependencyOrder"])

    def test_unconfirmed_resume_candidate_does_not_satisfy_prerequisite(self):
        roadmap = generate_personalized_roadmap({"skills": [{"canonical": "python", "source": "resume", "confirmed": False, "level": "advanced"}], "skillGoals": [{"canonical": "pytorch", "targetLevel": "intermediate"}]})
        self.assertIn("Python", roadmap["dependencyOrder"])
        self.assertEqual(roadmap["confirmedSkills"], [])

    def test_rejected_resume_skill_is_not_treated_as_confirmed(self):
        roadmap = generate_personalized_roadmap({"resume": {"candidateDecisions": [{"canonical": "python", "status": "rejected"}]}, "skillGoals": [{"canonical": "pytorch", "targetLevel": "intermediate"}]})
        self.assertIn("Python", roadmap["dependencyOrder"])

    def test_career_only_plan_works_without_resume_or_skills(self):
        roadmap = generate_personalized_roadmap({"targetCareer": "ai-ml-engineer", "skills": []})
        self.assertEqual(roadmap["status"], "ready")
        self.assertTrue(roadmap["careerRequirements"])
        self.assertTrue(roadmap["roadmapItems"])

    def test_job_specific_plan_uses_saved_job_requirements(self):
        roadmap = generate_personalized_roadmap({"latestJobMatch": {"summary": {"title": "CUDA Intern"}, "requirements": [{"canonical": "cuda", "importance": "high", "evidence": "Required for kernels"}]}})
        self.assertEqual(roadmap["target"], "CUDA Intern")
        self.assertEqual(roadmap["jobRequirements"][0]["canonicalName"], "cuda")
        self.assertIn("CUDA", roadmap["dependencyOrder"])
        cuda = roadmap["roadmapItems"][0]
        self.assertIn("vector-add kernel", cuda["practice"]["task"])
        self.assertIn("CPU reference", cuda["verification"]["task"])

    def test_job_only_plan_preserves_real_developing_and_missing_gaps(self):
        profile = {
            "skills": [
                {"canonical": name, "confirmed": True, "level": "beginner" if name == "machine learning" else "advanced"}
                for name in ("python", "numpy", "pandas", "machine learning")
            ],
            "skillGoals": [], "targetCareer": "",
            "latestJobMatch": {"summary": {"title": "ML Engineer"}, "requirements": [
                {"canonical": "machine learning", "importance": "high", "weight": 3, "evidence": ["Train models"]},
                {"canonical": "pytorch", "importance": "high", "weight": 3, "evidence": ["Build models"]},
            ]},
        }
        roadmap = generate_personalized_roadmap(profile)
        items = {item["canonicalSkill"]: item for item in roadmap["roadmapItems"]}
        self.assertEqual(roadmap["target"], "ML Engineer")
        self.assertIsNone(roadmap["careerId"])
        self.assertEqual(items["machine learning"]["currentStatus"], "developing")
        self.assertEqual(items["machine learning"]["importance"], "high")
        self.assertEqual(items["machine learning"]["sources"], ["job"])
        self.assertEqual(items["machine learning"]["requirementEvidence"], ["Train models"])
        self.assertEqual(items["pytorch"]["currentStatus"], "missing")
        self.assertEqual(items["deep learning"]["sources"], ["dependency"])
        self.assertNotIn("python", items)
        self.assertNotIn("react", items)
        self.assertLess(roadmap["dependencyOrder"].index("Machine Learning"), roadmap["dependencyOrder"].index("Deep Learning"))
        self.assertLess(roadmap["dependencyOrder"].index("Deep Learning"), roadmap["dependencyOrder"].index("PyTorch"))

    def test_all_covered_job_requirements_produce_no_forced_learning_items(self):
        names = ("python", "machine learning", "pytorch")
        roadmap = generate_personalized_roadmap({
            "skills": [{"canonical": name, "confirmed": True, "level": "advanced"} for name in names],
            "skillGoals": [], "targetCareer": "",
            "latestJobMatch": {"summary": {"title": "ML Engineer"}, "requirements": [
                {"canonical": name, "importance": "high"} for name in names
            ]},
        })
        self.assertEqual(roadmap["status"], "complete_or_no_gaps")
        self.assertEqual(roadmap["roadmapItems"], [])
        self.assertEqual(roadmap["jobRequirements"], roadmap["skillGapAnalysis"]["requirements"])
        self.assertTrue(all(item["status"] == "matched" for item in roadmap["jobRequirements"]))
        self.assertEqual(roadmap["skillGapAnalysis"]["readinessScore"], 100.0)
        self.assertIsNone(roadmap["nextBestAction"])

    def test_career_and_job_requirements_are_combined_and_distinguished(self):
        roadmap = generate_personalized_roadmap({"targetCareer": "ai-ml-engineer", "latestJobMatch": {"summary": {"title": "ML Intern"}, "requirements": [{"canonical": "cuda", "importance": "high", "evidence": "Required for kernels"}]}})
        self.assertTrue(roadmap["careerRequirements"])
        self.assertTrue(roadmap["jobRequirements"])
        self.assertIn("CUDA", roadmap["dependencyOrder"])
        self.assertTrue(any("job" in item["sources"] for item in roadmap["prioritizedGaps"]))

    def test_no_resume_skill_goal_plan_works(self):
        roadmap = generate_goal_roadmap({"skillGoals": [{"canonical": "pytorch", "currentLevel": "beginner", "targetLevel": "intermediate"}]})
        self.assertEqual(roadmap["status"], "ready")
        self.assertIn("PyTorch", roadmap["dependencyOrder"])

    def test_missing_career_goal_has_useful_empty_state(self):
        roadmap = generate_personalized_roadmap({"skills": ["Python"]})
        self.assertEqual(roadmap["status"], "needs_goal")
        self.assertEqual(roadmap["roadmapItems"], [])

    def test_empty_gap_target_returns_no_active_items(self):
        roadmap = generate_personalized_roadmap({"targetCareer": "ai-ml-engineer", "skills": [item for item in ["python", "machine learning", "deep learning", "pytorch", "tensorflow", "nlp", "llm", "langchain", "vector db", "scikit-learn", "data structures", "docker", "fastapi", "rest api", "git", "cloud", "sql", "math", "numpy", "pandas"]]})
        self.assertEqual(roadmap["roadmapItems"], [])
        self.assertIsNone(roadmap["completion"]["percent"])

    def test_malformed_profile_returns_a_useful_state(self):
        self.assertEqual(generate_personalized_roadmap(None)["status"], "invalid_input")

    def test_unknown_career_returns_a_useful_state(self):
        self.assertEqual(generate_personalized_roadmap({"targetCareer": "Unknown Role"})["status"], "invalid_goal")

    def test_generation_is_deterministic(self):
        profile = {"targetCareer": "devops-cloud", "skills": ["Linux", "AWS"], "skillGoals": [{"canonical": "kubernetes", "priority": "high"}]}
        self.assertEqual(generate_personalized_roadmap(profile), generate_personalized_roadmap(profile))

    def test_progress_is_derived_only_from_verification(self):
        initial = generate_personalized_roadmap({"skillGoals": [{"canonical": "cuda", "priority": "high"}]})
        item = initial["roadmapItems"][0]
        progress = {item["id"]: {"learningStatus": "completed", "practiceStatus": "completed", "verificationStatus": "completed"}}
        completed = generate_personalized_roadmap({"skillGoals": [{"canonical": "cuda", "priority": "high"}], "roadmapProgress": progress})
        self.assertEqual(completed["roadmapItems"][0]["status"], "completed")
        self.assertEqual(completed["completion"]["percent"], 100)
        self.assertEqual(completed["confirmedSkills"], [])

    def test_learning_practice_and_verification_states_remain_separate(self):
        roadmap = generate_personalized_roadmap({"skillGoals": [{"canonical": "cuda", "priority": "high"}]})
        item = roadmap["roadmapItems"][0]
        self.assertEqual(item["learning"]["status"], "not_started")
        self.assertEqual(item["practice"]["status"], "not_started")
        self.assertEqual(item["verification"]["status"], "not_started")
        self.assertTrue(item["learning"]["guidance"])
        self.assertTrue(item["practice"]["task"])
        self.assertTrue(item["verification"]["task"])

    def test_priority_ranking_and_learning_stages_are_both_exposed(self):
        roadmap = generate_personalized_roadmap({"targetCareer": "devops-cloud", "skills": []})
        self.assertTrue(roadmap["stages"])
        self.assertEqual(roadmap["phases"], roadmap["stages"])
        self.assertTrue(roadmap["priorityRanking"])
        self.assertTrue(roadmap["nextBestAction"]["itemId"])

    def test_unconfirmed_profile_does_not_affect_phase_four_gap_result(self):
        base = analyze_skill_gap({"skills": ["Python"]}, "ai-ml-engineer")
        with_unconfirmed = analyze_skill_gap({"skills": ["Python", {"canonical": "pytorch", "confirmed": False}]}, "ai-ml-engineer")
        self.assertEqual(base["readinessScore"], with_unconfirmed["readinessScore"])

    def test_career_roadmap_entrypoint_preserves_legacy_shape(self):
        result = generate_learning_roadmap({"skills": ["Python"]}, "ai-ml-engineer")
        self.assertIn("phases", result)
        self.assertIn("priorityRanking", result)
        self.assertIn("dependencyOrder", result)

    def test_resume_candidate_decision_is_not_rewritten(self):
        profile = {"resume": {"candidateDecisions": [{"canonical": "python", "status": "rejected"}]}, "skills": [{"canonical": "python", "confirmed": False}]}
        roadmap = generate_personalized_roadmap({**profile, "skillGoals": [{"canonical": "pytorch"}]})
        self.assertEqual(profile["resume"]["candidateDecisions"][0]["status"], "rejected")
        self.assertIn("Python", roadmap["dependencyOrder"])


if __name__ == "__main__":
    unittest.main(verbosity=2)
