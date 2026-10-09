"""Contract tests for catalogue-driven personalized roadmaps."""
import json
import re
import unittest
from pathlib import Path

from roadmap_engine import generate_personalized_roadmap, get_catalogue_tracks
from skill_normalizer import is_known_skill, normalize_term

ROOT = Path(__file__).resolve().parents[1]
CATALOGUE = json.loads((ROOT / "tech_vortex_roadmap_catalogue" / "roadmap_catalogue.json").read_text(encoding="utf-8"))
TRACK_IDS = {
    "machine-learning-ai", "data-science", "full-stack", "backend", "cloud-devops",
    "iot-embedded", "dsa-problem-solving", "software-engineering",
}


class RoadmapCatalogueTests(unittest.TestCase):
    def test_catalogue_loads_all_eight_tracks(self):
        tracks = get_catalogue_tracks()
        self.assertEqual({item["id"] for item in tracks}, TRACK_IDS)
        self.assertTrue(all(item["skillCount"] > 0 for item in tracks))

    def test_track_skills_use_the_shared_ontology(self):
        for track in CATALOGUE["tracks"].values():
            for item in track["skills"]:
                self.assertTrue(is_known_skill(item["skill"]), item["skill"])
                for prerequisite in item["prerequisites"]:
                    self.assertTrue(is_known_skill(prerequisite), prerequisite)

    def test_resources_are_centralized_by_canonical_skill(self):
        resources = CATALOGUE["resourcesBySkill"]
        self.assertTrue(resources)
        for track in CATALOGUE["tracks"].values():
            for item in track["skills"]:
                self.assertNotIn("youtube", item)
                self.assertNotIn("officialDocumentationUrl", item)
                self.assertIn(normalize_term(item["skill"]), resources)

    def test_documentation_urls_are_https(self):
        for skill, resource in CATALOGUE["resourcesBySkill"].items():
            for url in resource["officialDocumentationUrls"]:
                self.assertTrue(url.startswith("https://"), skill)

    def test_youtube_ids_and_thumbnails_are_well_formed(self):
        for skill, resource in CATALOGUE["resourcesBySkill"].items():
            for video in resource["youtube"]:
                self.assertRegex(video["videoId"], r"^[A-Za-z0-9_-]{11}$", skill)
                self.assertEqual(video["url"], f"https://www.youtube.com/watch?v={video['videoId']}")
                self.assertTrue(video["thumbnailUrl"].startswith(f"https://i.ytimg.com/vi/{video['videoId']}/"))
                self.assertIn(video["selectionBasis"], {"high_view_verified", "curated_relevant"})
                self.assertTrue(video["viewsAtResearch"] is None or isinstance(video["viewsAtResearch"], int))

    def test_all_eight_tracks_generate_and_preserve_catalogue_skills(self):
        raw_by_id = CATALOGUE["tracks"]
        for track in get_catalogue_tracks():
            result = generate_personalized_roadmap({"targetCareer": track["id"], "skills": []})
            self.assertEqual(result["status"], "ready", track["id"])
            self.assertEqual(result["catalogueTrackId"], track["id"])
            represented = {item["canonicalSkill"] for item in result["roadmapItems"]}
            represented.update(item["canonicalSkill"] for stage in result["phases"] for item in stage["completedSkills"])
            expected = {normalize_term(item["skill"]) for item in raw_by_id[track["id"]]["skills"]}
            self.assertTrue(expected <= represented, (track["id"], sorted(expected - represented)))

    def test_confirmed_skills_show_as_completed_and_leave_active_path(self):
        result = generate_personalized_roadmap({"targetCareer": "machine-learning-ai", "skills": ["Python"]})
        self.assertNotIn("Python", result["dependencyOrder"])
        foundation = next(stage for stage in result["phases"] if stage["title"] == "Foundations")
        self.assertIn("python", {item["canonicalSkill"] for item in foundation["completedSkills"]})
        self.assertEqual(result["completion"]["completedItems"], 1)
        self.assertGreater(result["completion"]["totalItems"], 1)

    def test_unconfirmed_resume_candidate_does_not_satisfy_catalogue_requirement(self):
        result = generate_personalized_roadmap({"targetCareer": "machine-learning-ai", "skills": [{"canonical": "python", "source": "resume", "confirmed": False}]})
        self.assertIn("Python", result["dependencyOrder"])
        self.assertNotIn("python", {item["canonicalSkill"] for stage in result["phases"] for item in stage["completedSkills"]})
        self.assertEqual(result["confirmedSkills"], [])

    def test_skill_goal_is_not_a_confirmed_skill(self):
        result = generate_personalized_roadmap({"targetCareer": "data-science", "skills": [], "skillGoals": [{"canonical": "cuda", "priority": "high"}]})
        cuda = next(item for item in result["roadmapItems"] if item["canonicalSkill"] == "cuda")
        self.assertTrue(cuda["isGoal"])
        self.assertEqual(cuda["currentStatus"], "missing")
        self.assertNotIn("cuda", {item["canonicalSkill"] for skill in result["confirmedSkills"]})

    def test_job_requirements_extend_instead_of_replace_the_track(self):
        result = generate_personalized_roadmap({"targetCareer": "backend", "skills": [], "latestJobMatch": {"summary": {"title": "ML Systems Engineer"}, "requirements": [{"canonical": "cuda", "importance": "high", "evidence": "Required for this role"}]}})
        cuda = next(item for item in result["roadmapItems"] if item["canonicalSkill"] == "cuda")
        self.assertEqual(result["catalogueTrackId"], "backend")
        self.assertTrue(cuda["isJobSpecific"])
        self.assertIn("job", cuda["sources"])
        self.assertEqual(cuda["priority"], "high")
        self.assertTrue(result["careerRequirements"])

    def test_catalogue_dependencies_keep_learning_order_ahead_of_priority(self):
        result = generate_personalized_roadmap({"targetCareer": "machine-learning-ai", "skills": [], "latestJobMatch": {"requirements": [{"canonical": "pytorch", "importance": "high"}]}})
        order = result["dependencyOrder"]
        self.assertLess(order.index("Neural Networks"), order.index("PyTorch"))

    def test_catalogue_resource_data_is_exposed_on_roadmap_items(self):
        result = generate_personalized_roadmap({"targetCareer": "machine-learning-ai", "skills": []})
        python = next(item for item in result["roadmapItems"] if item["canonicalSkill"] == "python")
        self.assertEqual(python["officialDocumentationUrl"], "https://docs.python.org/3/tutorial/")
        self.assertTrue(python["youtube"])
        self.assertTrue(python["youtube"][0]["thumbnailUrl"].startswith("https://i.ytimg.com/"))
        self.assertEqual(python["youtube"][0]["viewsAtResearch"], 49300746)

    def test_curated_video_without_views_is_not_marked_popular(self):
        result = generate_personalized_roadmap({"targetCareer": "machine-learning-ai", "skills": []})
        pytorch = next(item for item in result["roadmapItems"] if item["canonicalSkill"] == "pytorch")
        video = pytorch["youtube"][0]
        self.assertEqual(video["selectionBasis"], "curated_relevant")
        self.assertIsNone(video["viewsAtResearch"])


if __name__ == "__main__":
    unittest.main(verbosity=2)
