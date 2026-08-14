import test from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from '../src/server.js';

test('E2E / Integration: Staging Smoke Verification', async (t) => {
  await t.test('Health endpoint should respond with UP status', async () => {
    const server = createServer();
    
    await new Promise((resolve) => server.listen(0, resolve));
    const port = server.address().port;

    try {
      const res = await fetch(`http://127.0.0.1:${port}/health`);
      const data = await res.json();

      assert.strictEqual(res.status, 200);
      assert.strictEqual(data.status, 'UP');
      assert.ok(data.timestamp);
      assert.ok(data.environment);
    } finally {
      await new Promise((resolve) => server.close(resolve));
    }
  });

  await t.test('Info endpoint should report environment feature flags', async () => {
    const server = createServer();
    
    await new Promise((resolve) => server.listen(0, resolve));
    const port = server.address().port;

    try {
      const res = await fetch(`http://127.0.0.1:${port}/api/info`);
      const data = await res.json();

      assert.strictEqual(res.status, 200);
      assert.ok(data.features);
    } finally {
      await new Promise((resolve) => server.close(resolve));
    }
  });
});
