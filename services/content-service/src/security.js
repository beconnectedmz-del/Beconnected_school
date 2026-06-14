'use strict';

// ─── Magic byte signatures ─────────────────────────────────────────────────────
// Each entry: { mime, offsets: [[byteOffset, ...expectedBytes], ...] }
// null in expectedBytes means "any byte" (wildcard).
const SIGNATURES = [
  {
    mime: 'image/jpeg',
    checks: [{ offset: 0, bytes: [0xFF, 0xD8, 0xFF] }],
  },
  {
    mime: 'image/png',
    checks: [{ offset: 0, bytes: [0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A] }],
  },
  {
    mime: 'image/webp',
    checks: [
      { offset: 0, bytes: [0x52, 0x49, 0x46, 0x46] }, // RIFF
      { offset: 8, bytes: [0x57, 0x45, 0x42, 0x50] }, // WEBP
    ],
  },
  {
    mime: 'image/gif',
    checks: [{ offset: 0, bytes: [0x47, 0x49, 0x46, 0x38] }], // GIF8
  },
  {
    mime: 'application/pdf',
    checks: [{ offset: 0, bytes: [0x25, 0x50, 0x44, 0x46] }], // %PDF
  },
  {
    mime: 'video/mp4',
    // MP4 has the ftyp box at offset 4-7 (bytes 4='f',5='t',6='y',7='p')
    checks: [{ offset: 4, bytes: [0x66, 0x74, 0x79, 0x70] }],
  },
  {
    mime: 'video/webm',
    checks: [{ offset: 0, bytes: [0x1A, 0x45, 0xDF, 0xA3] }], // EBML
  },
  {
    mime: 'video/ogg',
    checks: [{ offset: 0, bytes: [0x4F, 0x67, 0x67, 0x53] }], // OggS
  },
];

// ALLOWED_MIMES for each upload endpoint
const VIDEO_MIMES    = new Set(['video/mp4', 'video/webm', 'video/ogg']);
const MATERIAL_MIMES = new Set(['application/pdf', 'image/jpeg', 'image/png', 'image/webp', 'image/gif']);

/**
 * Reads the magic bytes of a Buffer and returns the detected MIME type.
 * Returns null if signature is unrecognised.
 */
function detectMimeFromBytes(buffer) {
  for (const sig of SIGNATURES) {
    const match = sig.checks.every(({ offset, bytes }) => {
      if (buffer.length < offset + bytes.length) return false;
      return bytes.every((b, i) => b === null || buffer[offset + i] === b);
    });
    if (match) return sig.mime;
  }
  return null;
}

/**
 * Validates an uploaded file buffer:
 * 1. Declared MIME must be in the allowed set.
 * 2. Magic bytes must match declared MIME (prevents MIME spoofing).
 * 3. Filename must not contain path traversal or null bytes.
 * 4. Filename extension must be consistent with MIME.
 *
 * @param {Buffer} buffer - File buffer (from multer memoryStorage)
 * @param {string} declaredMime - MIME from multer (req.file.mimetype)
 * @param {string} filename - Original filename (req.file.originalname)
 * @param {'video'|'material'} uploadType
 * @returns {{ ok: boolean, error?: string }}
 */
function validateUpload(buffer, declaredMime, filename, uploadType) {
  const allowedSet = uploadType === 'video' ? VIDEO_MIMES : MATERIAL_MIMES;

  // 1. MIME in whitelist
  if (!allowedSet.has(declaredMime)) {
    return { ok: false, error: `tipo não permitido: ${declaredMime}` };
  }

  // 2. Filename safety
  if (!filename || filename.length > 255) {
    return { ok: false, error: 'nome de ficheiro inválido' };
  }
  if (/(\.\.|\/|\\|\x00)/.test(filename)) {
    return { ok: false, error: 'nome de ficheiro contém caracteres proibidos' };
  }

  // 3. Magic bytes validation (needs at least 12 bytes)
  if (buffer.length < 12) {
    return { ok: false, error: 'ficheiro demasiado pequeno ou corrompido' };
  }
  const detectedMime = detectMimeFromBytes(buffer);
  if (!detectedMime) {
    return { ok: false, error: 'formato de ficheiro não reconhecido' };
  }
  if (detectedMime !== declaredMime) {
    return { ok: false, error: `MIME declarado (${declaredMime}) não corresponde ao conteúdo real (${detectedMime})` };
  }

  // 4. Extension consistency
  const ext = filename.split('.').pop().toLowerCase();
  if (!EXTENSION_MAP[detectedMime]?.includes(ext)) {
    return { ok: false, error: `extensão .${ext} não é consistente com o tipo ${detectedMime}` };
  }

  return { ok: true };
}

const EXTENSION_MAP = {
  'video/mp4':         ['mp4', 'm4v'],
  'video/webm':        ['webm'],
  'video/ogg':         ['ogg', 'ogv'],
  'image/jpeg':        ['jpg', 'jpeg'],
  'image/png':         ['png'],
  'image/webp':        ['webp'],
  'image/gif':         ['gif'],
  'application/pdf':   ['pdf'],
};

/**
 * Sanitises an object name for MinIO storage.
 * Removes leading slashes, collapses double slashes, strips null bytes.
 */
function sanitiseObjectName(name) {
  return name
    .replace(/\x00/g, '')
    .replace(/^\/+/, '')
    .replace(/\/\/+/g, '/')
    .slice(0, 1024); // MinIO object name limit
}

module.exports = { validateUpload, sanitiseObjectName, detectMimeFromBytes };
