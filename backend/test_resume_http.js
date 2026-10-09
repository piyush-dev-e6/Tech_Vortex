'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const http = require('node:http');
const { execFile } = require('node:child_process');
const { app } = require('./server');

async function makeDocx(filename) {
  const script = String.raw`import sys, zipfile
path = sys.argv[1]
types = '<?xml version="1.0"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/></Types>'
rels = '<?xml version="1.0"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>'
doc = '<?xml version="1.0"?><w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body><w:p><w:r><w:t>Skills</w:t></w:r></w:p><w:p><w:r><w:t>Python, PyTorch</w:t></w:r></w:p><w:p><w:r><w:t>Projects</w:t></w:r></w:p><w:p><w:r><w:t>Built a classifier using PyTorch and Python.</w:t></w:r></w:p><w:sectPr/></w:body></w:document>'
with zipfile.ZipFile(path, 'w', zipfile.ZIP_DEFLATED) as z:
 z.writestr('[Content_Types].xml', types); z.writestr('_rels/.rels', rels); z.writestr('word/document.xml', doc)
`;
  await new Promise((resolve, reject) => execFile('python3', ['-c', script, filename], error => error ? reject(error) : resolve()));
}

async function upload(baseUrl, filename, type, bytes) {
  const form = new FormData();
  form.append('resume', new Blob([bytes], { type }), filename);
  const response = await fetch(`${baseUrl}/api/resume/parse`, { method: 'POST', body: form });
  return { status: response.status, body: await response.json() };
}

async function uploadWithCaseSensitiveBoundary(port, filename, type, bytes) {
  const boundary = '----WebKitFormBoundaryCaseSensitive123';
  const prefix = Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="resume"; filename="${filename}"\r\nContent-Type: ${type}\r\n\r\n`);
  const suffix = Buffer.from(`\r\n--${boundary}--\r\n`);
  const body = Buffer.concat([prefix, bytes, suffix]);
  const response = await new Promise((resolve, reject) => {
    const request = http.request({ hostname: '127.0.0.1', port, path: '/api/resume/parse', method: 'POST', headers: {
      'Content-Type': `multipart/form-data; boundary=${boundary}`, 'Content-Length': body.length
    } }, result => {
      const chunks = [];
      result.on('data', chunk => chunks.push(chunk));
      result.on('end', () => resolve({ status: result.statusCode, body: JSON.parse(Buffer.concat(chunks).toString('utf8')) }));
    });
    request.on('error', reject);
    request.end(body);
  });
  return response;
}

(async () => {
  const server = app.listen(0, '127.0.0.1');
  await new Promise((resolve, reject) => { server.once('listening', resolve); server.once('error', reject); });
  const baseUrl = `http://127.0.0.1:${server.address().port}`;
  const temporaryDocx = path.join(os.tmpdir(), `elite-vortex-http-resume-${process.pid}.docx`);
  try {
    const health = await fetch(`${baseUrl}/api/health`);
    assert.equal(health.status, 200);

    const pdfPath = path.join(__dirname, '..', 'sample_ml_aspirant_resume.pdf');
    const pdf = await upload(baseUrl, 'sample_ml_aspirant_resume.pdf', 'application/pdf', fs.readFileSync(pdfPath));
    assert.equal(pdf.status, 200);
    assert.equal(pdf.body.success, true);
    assert.ok(pdf.body.extractedText.length > 1000);
    assert.ok(Object.keys(pdf.body.sections).length > 3);
    const python = pdf.body.candidates.find(skill => skill.canonical === 'python');
    assert.ok(python?.evidence?.length);
    assert.equal(python.confirmed, false);

    const txt = await upload(baseUrl, 'candidate.txt', 'text/plain', Buffer.from('Skills:\nPython\nProjects:\nBuilt a Python tool.'));
    assert.equal(txt.status, 200);
    assert.ok(txt.body.candidates.some(skill => skill.canonical === 'python'));
    const uppercaseBoundaryTxt = await uploadWithCaseSensitiveBoundary(server.address().port, 'boundary.txt', 'text/plain', Buffer.from('Skills:\nReact'));
    assert.equal(uppercaseBoundaryTxt.status, 200);
    assert.ok(uppercaseBoundaryTxt.body.candidates.some(skill => skill.canonical === 'react'));

    await makeDocx(temporaryDocx);
    const docx = await upload(baseUrl, 'candidate.docx', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', fs.readFileSync(temporaryDocx));
    assert.equal(docx.status, 200);
    assert.ok(docx.body.candidates.some(skill => skill.canonical === 'pytorch'));

    const malformed = await upload(baseUrl, 'broken.pdf', 'application/pdf', Buffer.from('not a pdf'));
    assert.equal(malformed.status, 422);
    const unsupported = await upload(baseUrl, 'broken.rtf', 'application/rtf', Buffer.from('text'));
    assert.equal(unsupported.status, 415);

    process.stdout.write(JSON.stringify({ http: true, health: health.status, pdf: pdf.status, txt: txt.status, docx: docx.status, malformed: malformed.status, unsupported: unsupported.status, uppercaseBoundary: uppercaseBoundaryTxt.status, pdfTextLength: pdf.body.extractedText.length, pdfSectionCount: Object.keys(pdf.body.sections).length, pdfSkillCount: pdf.body.candidates.length, pythonEvidence: python.evidence.length }) + '\n');
  } finally {
    try { fs.unlinkSync(temporaryDocx); } catch {}
    await new Promise(resolve => server.close(resolve));
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
