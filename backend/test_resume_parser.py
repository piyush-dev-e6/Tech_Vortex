"""Fixture-based tests for the PDF, DOCX, and TXT resume parser."""

import unittest
from io import BytesIO
import json
from pathlib import Path

from docx import Document
from pypdf import PdfWriter
from pypdf.generic import DecodedStreamObject, DictionaryObject, NameObject

from ml_engine import analyze_candidate
from resume_parser import ResumeParseError, parse_resume_bytes


TEXT_RESUME = """JANE DOE | Software Engineer
Education: B.Tech in Computer Science, Example Institute of Technology, Expected Graduation 2026, CGPA: 8.7
Technical Skills: Python, PyTorch, React.js, Docker, PostgreSQL
Projects:
Built an image classification model using PyTorch and Python.
Internships:
Software Engineering Intern at Example Co.
Certifications:
AWS Certified Cloud Practitioner
"""


def make_docx(text):
    document = Document()
    for line in text.splitlines():
        document.add_paragraph(line)
    output = BytesIO()
    document.save(output)
    return output.getvalue()


def make_pdf(text):
    writer = PdfWriter()
    page = writer.add_blank_page(width=612, height=792)
    font = DictionaryObject({NameObject("/Type"): NameObject("/Font"), NameObject("/Subtype"): NameObject("/Type1"), NameObject("/BaseFont"): NameObject("/Helvetica")})
    resources = DictionaryObject({NameObject("/Font"): DictionaryObject({NameObject("/F1"): writer._add_object(font)})})
    page[NameObject("/Resources")] = resources
    stream = DecodedStreamObject()
    escaped = text.replace("\\", "\\\\").replace("(", "\\(").replace(")", "\\)")
    stream.set_data(f"BT /F1 10 Tf 40 750 Td ({escaped}) Tj ET".encode("latin-1"))
    page[NameObject("/Contents")] = writer._add_object(stream)
    output = BytesIO()
    writer.write(output)
    return output.getvalue()


class ResumeParserTests(unittest.TestCase):
    def test_txt_extracts_fields_skills_evidence_and_categories(self):
        result = parse_resume_bytes(TEXT_RESUME.encode(), "jane.txt")
        profile = result["candidateProfile"]
        self.assertEqual(profile["name"], "Jane Doe")
        self.assertEqual(profile["graduationYear"], 2026)
        self.assertEqual(profile["cgpa"], 8.7)
        self.assertEqual(profile["college"], "Example Institute of Technology")
        pytorch = next(skill for skill in profile["skills"] if skill["canonical"] == "pytorch")
        self.assertTrue(any("using PyTorch" in item["text"] for item in pytorch["evidence"]))
        self.assertEqual(pytorch["source"], "resume")
        self.assertFalse(pytorch["confirmed"])
        self.assertEqual(pytorch["category"], "frameworks")
        self.assertTrue(profile["projects"])
        self.assertTrue(profile["internshipsOrWorkExperience"])
        self.assertTrue(profile["certifications"])
        self.assertEqual(profile["education"]["degree"], profile["degree"])

    def test_parsed_profile_is_accepted_by_career_analysis(self):
        profile = parse_resume_bytes(TEXT_RESUME.encode(), "jane.txt")["candidateProfile"]
        # Resume extraction is intentionally unconfirmed until a user reviews it.
        # This test covers the downstream confirmed-profile contract.
        profile["skills"] = [{**skill, "confirmed": True} for skill in profile["skills"]]
        result = analyze_candidate(profile)
        self.assertIn("Python", result["topSkillsPossessed"])
        ai_role = next(role for role in result["topRecommendations"] if role["id"] == "ai-ml-engineer")
        self.assertGreater(ai_role["scoreBreakdown"]["projectRelevance"], 0)

    def test_docx_and_pdf_are_parsed_as_documents(self):
        docx_result = parse_resume_bytes(make_docx(TEXT_RESUME), "resume.docx")
        pdf_result = parse_resume_bytes(make_pdf(TEXT_RESUME), "resume.pdf")
        self.assertEqual(docx_result["candidateProfile"]["name"], "Jane Doe")
        self.assertIn("python", [skill["canonical"] for skill in docx_result["candidateProfile"]["skills"]])
        self.assertEqual(pdf_result["candidateProfile"]["cgpa"], 8.7)
        self.assertIn("react", [skill["canonical"] for skill in pdf_result["candidateProfile"]["skills"]])

    def test_empty_resume_returns_empty_fields_without_guessing(self):
        result = parse_resume_bytes(b"", "empty.txt")
        profile = result["candidateProfile"]
        self.assertIsNone(profile["name"])
        self.assertIsNone(profile["degree"])
        self.assertEqual(profile["skills"], [])
        self.assertTrue(profile["warnings"])
        self.assertIn("name", profile["uncertainFields"])

    def test_malformed_documents_and_unsupported_types_fail_clearly(self):
        for data, filename in ((b"not a pdf", "bad.pdf"), (b"not a zip", "bad.docx"), (b"text", "bad.json")):
            with self.subTest(filename=filename):
                with self.assertRaises(ResumeParseError):
                    parse_resume_bytes(data, filename)

    def test_no_technical_skills_does_not_substitute_defaults(self):
        profile = parse_resume_bytes(b"ALEX RIVERA\nB.Tech in History\nVolunteer at a community center.", "no-skills.txt")["candidateProfile"]
        self.assertEqual(profile["skills"], [])
        self.assertEqual(profile["programmingLanguages"], [])

    def test_weak_skill_context_is_marked_uncertain(self):
        profile = parse_resume_bytes(b"JANE DOE\nReact is a UI framework.", "uncertain.txt")["candidateProfile"]
        react = next(skill for skill in profile["skills"] if skill["canonical"] == "react")
        self.assertLess(react["confidence"], 0.75)
        self.assertTrue(react["uncertain"])

    def test_section_aware_evidence_and_confidence(self):
        text = """JANE DOE
Skills:
Python
Projects:
Built a CNN image classifier using Python and PyTorch. Applied INT8 post-training quantization.
"""
        profile = parse_resume_bytes(text.encode(), "project.txt")["candidateProfile"]
        by_name = {skill["canonical"]: skill for skill in profile["skills"]}
        self.assertEqual(by_name["python"]["aliasesDetected"], ["Python"])
        self.assertTrue(any(item["section"] == "projects" and "using Python" in item["text"] for item in by_name["python"]["evidence"]))
        self.assertGreater(by_name["python"]["confidence"], 0.8)
        self.assertEqual(by_name["cnn"]["canonicalName"], "CNN")
        self.assertEqual(by_name["quantization"]["canonical"], "quantization")
        self.assertTrue(all(not skill["confirmed"] for skill in profile["skills"]))

    def test_aliases_merge_without_inference(self):
        text = """Skills: Python, Python 3, Python programming, PyTorch
Projects:
Used PyTorch for a data project.
"""
        profile = parse_resume_bytes(text.encode(), "aliases.txt")["candidateProfile"]
        python = [skill for skill in profile["skills"] if skill["canonical"] == "python"]
        self.assertEqual(len(python), 1)
        self.assertTrue({"Python", "Python 3", "Python programming"}.issubset(set(python[0]["aliasesDetected"])))
        self.assertNotIn("deep learning", {skill["canonical"] for skill in profile["skills"]})

    def test_sections_hash_and_structured_response_are_deterministic(self):
        payload = b"Skills:\nPython\nProjects:\nBuilt a Python tool."
        first = parse_resume_bytes(payload, "stable.txt")
        second = parse_resume_bytes(payload, "stable.txt")
        self.assertEqual(first["contentHash"], second["contentHash"])
        self.assertEqual(first["sections"], second["sections"])
        self.assertEqual(first["candidates"], first["candidateProfile"]["skills"])
        self.assertIn("skills", first["sections"])
        self.assertIn("projects", first["sections"])
        self.assertNotIn("education", first["sections"])

    def test_ontology_candidate_vocabulary_is_normalized(self):
        ontology = json.loads(Path(__file__).with_name("skill_ontology.json").read_text(encoding="utf-8"))
        self.assertTrue(set(ontology["aliases"].values()).issubset(set(ontology["skills"])))

    def test_upload_size_limit_is_enforced(self):
        with self.assertRaisesRegex(ResumeParseError, "5 MB"):
            parse_resume_bytes(b"x" * (5 * 1024 * 1024 + 1), "large.txt")


if __name__ == "__main__":
    unittest.main(verbosity=2)
