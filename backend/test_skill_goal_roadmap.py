import unittest

from skill_goal_roadmap import generate_goal_roadmap


class SkillGoalRoadmapTests(unittest.TestCase):
    def test_no_resume_goal_creates_ordered_learning_path(self):
        result = generate_goal_roadmap({"skillGoals": [
            {"canonical": "pytorch", "currentLevel": "beginner", "targetLevel": "intermediate", "priority": "high"}
        ]})
        names = [skill["skill"].lower() for phase in result["phases"] for skill in phase["skills"]]
        self.assertIn("python", names)
        self.assertIn("deep learning", names)
        self.assertIn("pytorch", names)
        self.assertLess(names.index("python"), names.index("pytorch"))
        self.assertEqual(result["priorityRanking"][-1]["skill"], "PyTorch")

    def test_python_goal_without_career_is_a_single_skill_path(self):
        result = generate_goal_roadmap({"skillGoals": [
            {"canonical": "python", "currentLevel": "beginner", "targetLevel": "intermediate", "priority": "high"}
        ]})
        names = [skill["skill"] for phase in result["phases"] for skill in phase["skills"]]
        self.assertEqual(names, ["Python"])
        self.assertIsNone(result["careerId"])
        self.assertTrue(result["roadmapItems"][0]["officialDocumentationUrl"])

    def test_individual_goals_can_coexist_with_separate_career_roadmap(self):
        result = generate_goal_roadmap({
            "targetCareer": "machine-learning-ai", "skills": [],
            "skillGoals": [{"canonical": "docker", "currentLevel": "beginner", "targetLevel": "intermediate"}],
        })
        self.assertEqual(result["careerId"], "machine-learning-ai")
        self.assertIn("Docker", result["dependencyOrder"])
        self.assertTrue(result["careerRequirements"])

    def test_confirmed_prerequisite_is_not_repeated(self):
        result = generate_goal_roadmap({"skills": ["Python", "NumPy", "Pandas", "Machine Learning", "Deep Learning"], "skillGoals": [
            {"canonical": "pytorch", "currentLevel": "beginner", "targetLevel": "intermediate"}
        ]})
        names = [skill["skill"] for phase in result["phases"] for skill in phase["skills"]]
        self.assertEqual(names, ["PyTorch"])

    def test_custom_goal_is_not_dropped(self):
        result = generate_goal_roadmap({"skillGoals": [{"canonical": "model quantization", "currentLevel": "beginner", "targetLevel": "familiar"}]})
        self.assertEqual(result["phases"][0]["skills"][0]["skill"], "Model Quantization")

    def test_no_goals_returns_intentional_empty_result(self):
        self.assertEqual(generate_goal_roadmap({"skillGoals": []})["phases"], [])


if __name__ == "__main__":
    unittest.main(verbosity=2)
