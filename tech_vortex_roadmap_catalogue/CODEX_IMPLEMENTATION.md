# Tech Vortex Roadmap Catalogue — Codex Integration

## Files
- `roadmap_catalogue.json` — canonical tracks, ordered skills, prerequisites, documentation links, YouTube metadata and thumbnails.

## Tracks
1. Machine Learning / AI
2. Data Science
3. Full-Stack Development
4. Backend Development
5. Cloud / DevOps
6. IoT / Embedded Systems
7. DSA & Problem Solving
8. Software Engineering Fundamentals

## Required integration behavior

### 1. Load the catalogue
Import `roadmap_catalogue.json` from the backend/shared data layer. Do not hardcode roadmap skills into JSX.

### 2. Career selection
When a user selects a career, resolve the selected track ID and pass its skill graph into the existing Phase 4/5 roadmap engine.

### 3. Personalization
Use the existing canonical skill state:
- confirmed skills
- developing skills
- skill goals
- career requirements
- job requirements
- prioritized gaps

Confirmed skills should appear as completed prerequisites, not as active learning tasks.

### 4. Job-description personalization
Do NOT replace the selected career track with the job description. Merge job requirements into the selected track:
- existing track skills remain the learning backbone
- job-specific requirements increase priority
- requirements outside the track may be appended as job-specific skills

### 5. Resume personalization
Unconfirmed resume candidates must not count as confirmed skills.

### 6. Resource cards
Each roadmap skill should show:
- official documentation/tutorial link
- YouTube title
- channel
- thumbnail
- view count only when `viewsAtResearch` is non-null
- `Watch on YouTube` action

Use the thumbnail URL already supplied in the catalogue. Do not download or store image files.

### 7. Missing-resource fallback
If `youtube` is empty:
- show `Find tutorials on YouTube`
- use `youtubeSearchUrl`
- do not invent a video ID or thumbnail.

### 8. Roadmap card model
Recommended runtime shape:

```js
{
  skill: "PyTorch",
  status: "missing",
  priority: "high",
  stage: "Deep Learning",
  prerequisites: ["Python", "Neural Networks"],
  officialDocumentationUrl: "...",
  youtube: [...],
  practice: [],
  verification: []
}
```

### 9. UI
For each stage:
- stage title
- progress count
- completed skills
- current/high-priority skills
- missing skills
- expandable skill cards

Skill card:
- status
- priority
- prerequisites
- Learn: documentation
- Watch: YouTube thumbnail
- Practice
- Verify

### 10. Do not break existing architecture
Preserve:
- Phase 4 Skill Intelligence
- canonical skill ontology
- profile persistence
- job-match logic
- existing roadmap API contracts where possible

Only replace the roadmap's static/duplicated skill source with this catalogue.

## Important data-quality note
The catalogue deliberately does not fabricate YouTube popularity. Entries with a numeric `viewsAtResearch` were returned with an observable view count during web research. Entries with `null` use a curated relevant video and should not be labelled “most viewed”.

## Verification
After integration:
1. Run JSON parse validation.
2. Run existing backend tests.
3. Run frontend build.
4. Test each of the 8 track selections.
5. Test a resume with several confirmed skills.
6. Test a job description that adds skills outside the career track.
7. Verify YouTube thumbnails load.
8. Verify documentation links open.
9. Verify confirmed skills are skipped from active learning.
10. Verify unconfirmed resume candidates do not satisfy gaps.
