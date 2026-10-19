import test from 'node:test';
import assert from 'node:assert/strict';
import { createTransport } from '../src/transport.js';
test('a timeout retains the session token; retry submits the same token and move', async () => {
  const bodies = [];
  const remote = createTransport({ request: async body => {
    bodies.push(body);
    if (bodies.length === 1) throw new TypeError('offline');
    return { status: 200, data: { token: 'next', view: { guesses: ['KALEM'] } } };
  } });
  const session = { token: 'previous', view: { guesses: [] } };
  await assert.rejects(remote.move(session, 'KALEM'), /korundu/);
  assert.equal(session.token, 'previous');
  assert.deepEqual(session.view.guesses, []);
  await remote.move(session, 'KALEM');
  assert.deepEqual(bodies[0], bodies[1]);
  assert.equal(session.token, 'next');
});
test('double taps produce a single pending move', async () => {
  let finish, calls = 0;
  const remote = createTransport({ request: () => { calls++; return new Promise(resolve => { finish = resolve; }); } });
  const session = { token: 'original' };
  const first = remote.move(session, 'KALEM');
  await assert.rejects(remote.move(session, 'KALEM'), /Önceki/);
  assert.equal(calls, 1);
  finish({ status: 200, data: { token: 'next', view: {} } });
  await first;
});
test('saved games resume; invalid sessions and rate limits never replace saves', async () => {
  let body;
  const remote = createTransport({ request: async value => { body = value; return { status: 400, data: { error: 'INVALID_SESSION' } }; } });
  await assert.rejects(remote.open('harfle', { token: 'saved' }), /Kaydın silinmedi/);
  assert.equal(body.action, 'resume');
  const limited = createTransport({ request: async () => ({ status: 429 }) });
  await assert.rejects(limited.open('harfle'), /bekleyip/);
});
