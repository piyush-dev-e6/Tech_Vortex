"""Deterministic personalization and dependency tests for learning roadmaps."""

import unittest

from ml_engine import analyze_candidate, generate_learning_roadmap


class LearningRoadmapTests(unittest.TestCase):
    def test_ai_beginner_roadmap_orders_only_actual_gaps(self):
        profile = {
            "skills": ["Python", {"canonical": "numpy", "level": "developing"}],
            "experienceLevel": "beginner",
        }
        roadmap = generate_learning_roadmap(profile, "ai-ml-engineer")
        order = roadmap["dependencyOrder"]
        self.assertNotIn("Python", order)
        self.assertLess(order.index("NumPy"), order.index("Pandas"))
        self.assertLess(order.index("Pandas"), order.index("Machine Learning"))
        self.assertEqual(roadmap["experienceLevel"], "beginner")
        numpy = next(item for item in roadmap["priorityRanking"] if item["skill"] == "NumPy")
        self.assertEqual(numpy["currentStatus"], "developing")
        self.assertEqual(numpy["prerequisites"], ["Python"])

    def test_web_intermediate_roadmap_observes_mastered_prerequisites(self):
        profile = {"skills": ["HTML", "CSS", "JavaScript"], "experienceLevel": "intermediate"}
        roadmap = generate_learning_roadmap(profile, "fullstack-architect")
        self.assertNotIn("HTML", roadmap["dependencyOrder"])
        self.assertNotIn("JavaScript", roadmap["dependencyOrder"])
        react = next(item for item in roadmap["priorityRanking"] if item["skill"] == "React")
        self.assertIn("JavaScript", react["prerequisites"])
        self.assertIn("React", roadmap["dependencyOrder"])

    def test_devops_experienced_roadmap_places_container_dependencies_first(self):
        profile = {
            "skills": ["Linux", "AWS", "Git", {"name": "Docker", "level": "developing"}],
            "experienceLevel": "experienced",
        }
        roadmap = generate_learning_roadmap(profile, "devops-cloud")
        order = roadmap["dependencyOrder"]
        self.assertLess(order.index("Docker"), order.index("Kubernetes"))
        self.assertLess(order.index("Kubernetes"), order.index("Prometheus"))
        self.assertLess(order.index("Prometheus"), order.index("Grafana"))
        terraform = next(item for item in roadmap["priorityRanking"] if item["skill"] == "Terraform")
        self.assertEqual(terraform["prerequisites"], ["AWS"])
        self.assertIn("operational checks", roadmap["phases"][-1]["projectMilestone"]["objective"])

    def test_every_skill_has_reason_verification_and_valid_priority(self):
        roadmap = generate_learning_roadmap({"skills": []}, "data-intelligence")
        self.assertTrue(roadmap["phases"])
        for skill in roadmap["priorityRanking"]:
            self.assertIn(skill["priority"], {"critical", "high", "medium"})
            self.assertTrue(skill["reason"])
            self.assertTrue(skill["verification"])
        for phase in roadmap["phases"]:
            self.assertTrue(phase["projectMilestone"]["deliverables"])

    def test_roadmap_is_deterministic_and_analysis_api_includes_it(self):
        profile = {"skills": ["React", "JavaScript"], "targetCareer": "fullstack-architect"}
        first = generate_learning_roadmap(profile, "fullstack-architect")
        second = generate_learning_roadmap(profile, "fullstack-architect")
        self.assertEqual(first, second)
        self.assertIn("learningRoadmap", analyze_candidate(profile))
        self.assertIn("does not guarantee employment", first["readinessContext"])


if __name__ == "__main__":
    unittest.main(verbosity=2)
