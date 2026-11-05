import { test } from 'vitest';
import assert from 'node:assert/strict';
import { packetUrl, admissionPacketUrl } from './packets.js';

test('state packet downloads preserve the requested jurisdiction', () => {
  for (const [code, inputs] of [
    ['FL', ['FL', 'fl', 'Florida', 'florida', 1, '1']],
    ['IN', ['IN', 'in', 'Indiana', 'indiana', 2, '2']],
    ['GA', ['GA', 'ga', 'Georgia', 'georgia', 3, '3']],
  ]) {
    for (const input of inputs) {
      assert.equal(packetUrl(input), `/packets/${code}-Employment-Packet.pdf`, String(input));
      assert.equal(admissionPacketUrl(input), `/packets/${code}-Admission-Packet.pdf`, String(input));
    }
  }
});
