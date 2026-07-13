import assert from 'node:assert/strict';
import {
    ANSWERLATTICE_MAX_DOCX_XML_BYTES,
    assertAnswerlatticeDocxEntryIsBounded,
    isValidAnswerlatticeMediaSignature,
} from '../../src/lib/answerlattice/knowledgeIntakeFileSafety';

const ascii = (value: string) => Buffer.from(value, 'binary');
const mp4 = Buffer.concat([Buffer.from([0, 0, 0, 20]), ascii('ftyp'), ascii('isom0000')]);
const webm = Buffer.from([0x1a, 0x45, 0xdf, 0xa3, 0, 0, 0, 0]);
const mp3 = ascii('ID3\u0004\u0000\u0000\u0000\u0000');
const aac = Buffer.from([0xff, 0xf1, 0x50, 0x80, 0, 0, 0, 0]);
const wave = Buffer.concat([ascii('RIFF'), Buffer.from([0, 0, 0, 0]), ascii('WAVE')]);

assert.equal(isValidAnswerlatticeMediaSignature(mp4, 'video/mp4'), true);
assert.equal(isValidAnswerlatticeMediaSignature(mp4, 'audio/mpeg'), false, 'MP4 data must not pass as MP3');
assert.equal(isValidAnswerlatticeMediaSignature(mp3, 'audio/mpeg'), true);
assert.equal(isValidAnswerlatticeMediaSignature(mp3, 'video/mp4'), false);
assert.equal(isValidAnswerlatticeMediaSignature(aac, 'audio/aac'), true);
assert.equal(isValidAnswerlatticeMediaSignature(aac, 'audio/mpeg'), false, 'AAC ADTS must not pass as MP3');
assert.equal(isValidAnswerlatticeMediaSignature(wave, 'audio/wav'), true);
assert.equal(isValidAnswerlatticeMediaSignature(wave, 'audio/ogg'), false);
assert.equal(isValidAnswerlatticeMediaSignature(webm, 'video/webm'), true);
assert.equal(isValidAnswerlatticeMediaSignature(webm, 'audio/webm'), true);
assert.equal(isValidAnswerlatticeMediaSignature(Buffer.from('not-media'), 'video/mp4'), false);

assert.doesNotThrow(() => assertAnswerlatticeDocxEntryIsBounded({
    compressedSize: 1024,
    uncompressedSize: 24 * 1024,
}));
assert.throws(() => assertAnswerlatticeDocxEntryIsBounded(undefined), /metadata/);
assert.throws(() => assertAnswerlatticeDocxEntryIsBounded({ compressedSize: 1, uncompressedSize: 1000 }), /ratio/);
assert.throws(() => assertAnswerlatticeDocxEntryIsBounded({
    compressedSize: 64 * 1024,
    uncompressedSize: ANSWERLATTICE_MAX_DOCX_XML_BYTES + 1,
}), /too large/);

console.log('Answerlattice intake file-safety checks passed.');
