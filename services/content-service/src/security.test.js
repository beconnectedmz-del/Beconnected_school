'use strict'

const assert = require('node:assert/strict')
const { test } = require('node:test')
const { validateUpload, sanitiseObjectName } = require('./security')

// ─── Magic-byte helpers ───────────────────────────────────────────────────────

const makeJpeg = () => {
  const b = Buffer.alloc(12)
  b[0] = 0xff; b[1] = 0xd8; b[2] = 0xff; b[3] = 0xe0
  return b
}
const makePng = () => {
  const b = Buffer.alloc(16)
  Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]).copy(b)
  return b
}
const makeZip = () => Buffer.from([0x50, 0x4b, 0x03, 0x04, 0x00, 0x00])

// ─── Tests ────────────────────────────────────────────────────────────────────

test('valid JPEG passes all checks', () => {
  const result = validateUpload(makeJpeg(), 'image/jpeg', 'photo.jpg', 'material')
  assert.equal(result.ok, true, result.error)
})

test('valid PNG passes all checks', () => {
  const result = validateUpload(makePng(), 'image/png', 'slide.png', 'material')
  assert.equal(result.ok, true, result.error)
})

test('MIME mismatch is rejected', () => {
  // Provide a PNG buffer but declare it as JPEG
  const result = validateUpload(makePng(), 'image/jpeg', 'fake.jpg', 'material')
  assert.equal(result.ok, false)
  assert.ok(result.error, 'should have an error message')
})

test('disallowed MIME type is rejected', () => {
  const result = validateUpload(makeZip(), 'application/zip', 'archive.zip', 'material')
  assert.equal(result.ok, false)
})

test('path traversal in filename is rejected', () => {
  const result = validateUpload(makeJpeg(), 'image/jpeg', '../../../etc/passwd', 'material')
  assert.equal(result.ok, false)
})

test('extension mismatch is rejected', () => {
  // PNG bytes but .jpg extension
  const result = validateUpload(makePng(), 'image/png', 'photo.jpg', 'material')
  assert.equal(result.ok, false)
})

test('sanitiseObjectName strips path separators', () => {
  const safe = sanitiseObjectName('../../etc/passwd.pdf')
  assert.ok(!safe.includes('/'), 'should not contain forward slash')
  assert.ok(!safe.includes('\\'), 'should not contain backslash')
  assert.ok(!safe.includes('..'), 'should not contain ..')
})

test('sanitiseObjectName preserves legitimate filename', () => {
  const name = 'lecture-01_slides.pdf'
  assert.equal(sanitiseObjectName(name), name)
})
