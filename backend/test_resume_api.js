'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { execFile } = require('node:child_process');
const { app } = require('./server');

const route = app._router.stack.find(item => item.route?.path === '/api/resume/parse' && item.route.methods.post);
assert.ok(route, 'resume parse route exists');
const handler = route.route.stack.at(-1).handle;

function invoke({ filename, contentType = 'text/plain', body }) {
  const req = { body, get(name) { return name.toLowerCase() === 'x-filename' ? encodeURIComponent(filename) : name.toLowerCase() === 'content-type' ? contentType : ''; } };
  const res = { statusCode: 200, status(code) { this.statusCode = code; return this; }, json(value) { this.body = value; return this; } };
  return Promise.resolve(handler(req, res)).then(() => res);
}

(async () => {
  const parsed = await invoke({ filename: 'candidate.txt', body: Buffer.from('Skills:\nPython\nProjects:\nBuilt a Python tool.') });
  assert.equal(parsed.statusCode, 200);
  assert.equal(parsed.body.success, true);
  assert.equal(parsed.body.candidates[0].canonical, 'python');
  assert.equal(parsed.body.candidates[0].confirmed, false);
  assert.ok(parsed.body.sections.skills);
  assert.ok(parsed.body.candidates[0].evidence.some(item => item.section === 'projects'));
  assert.ok(parsed.body.contentHash);

  const pdfPath = path.join(__dirname, '..', 'sample_ml_aspirant_resume.pdf');
  assert.ok(fs.existsSync(pdfPath), 'actual sample PDF resume fixture exists');
  const pdf = await invoke({ filename: 'sample_ml_aspirant_resume.pdf', contentType: 'application/pdf', body: fs.readFileSync(pdfPath) });
  assert.equal(pdf.statusCode, 200);
  assert.equal(pdf.body.success, true);
  assert.ok(pdf.body.extractedTextLength > 1000);
  assert.ok(pdf.body.sections.summary);
  assert.ok(pdf.body.sections.education);
  assert.ok(pdf.body.sections.skills);
  assert.ok(pdf.body.sections.projects);
  assert.ok(pdf.body.sections.experience);
  assert.ok(pdf.body.sections.achievements);
  const pdfPython = pdf.body.candidates.find(skill => skill.canonical === 'python');
  assert.ok(pdfPython?.evidence.some(item => item.section === 'projects'));
  assert.equal(pdfPython?.confirmed, false);

  const docxPath = path.join(os.tmpdir(), `elite-vortex-resume-fixture-${process.pid}.docx`);
  const makeDocx = String.raw`import sys, zipfile
path = sys.argv[1]
types = '<?xml version="1.0"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/></Types>'
rels = '<?xml version="1.0"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>'
doc = '<?xml version="1.0"?><w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body><w:p><w:r><w:t>Skills</w:t></w:r></w:p><w:p><w:r><w:t>Python, PyTorch</w:t></w:r></w:p><w:p><w:r><w:t>Projects</w:t></w:r></w:p><w:p><w:r><w:t>Built a classifier using PyTorch and Python.</w:t></w:r></w:p><w:sectPr/></w:body></w:document>'
with zipfile.ZipFile(path, 'w', zipfile.ZIP_DEFLATED) as z:
 z.writestr('[Content_Types].xml', types); z.writestr('_rels/.rels', rels); z.writestr('word/document.xml', doc)
`;
  await new Promise((resolve, reject) => execFile('python3', ['-c', makeDocx, docxPath], error => error ? reject(error) : resolve()));
  const docx = await invoke({ filename: 'fixture.docx', contentType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', body: fs.readFileSync(docxPath) });
  fs.unlinkSync(docxPath);
  assert.equal(docx.statusCode, 200);
  assert.ok(docx.body.sections.skills);
  assert.ok(docx.body.candidates.some(skill => skill.canonical === 'pytorch'));
  assert.ok(docx.body.candidates.find(skill => skill.canonical === 'pytorch').evidence.some(item => item.section === 'projects'));

  const malformed = await invoke({ filename: 'broken.pdf', contentType: 'application/pdf', body: Buffer.from('not a pdf') });
  assert.equal(malformed.statusCode, 422);
  const unsupported = await invoke({ filename: 'broken.rtf', body: Buffer.from('text') });
  assert.equal(unsupported.statusCode, 415);
  process.stdout.write(JSON.stringify({ resumeParseApi: true, actualPdf: true, txt: true, docx: true, structuredEvidence: true, malformedHandling: true, typeValidation: true }) + '\n');
})().catch(error => { console.error(error); process.exitCode = 1; });
