import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

const root = process.cwd();
const expectedFiles = [
  ".env.example",
  "lib/supabase/client.ts",
  "lib/supabase/server.ts",
  "lib/auth/session.ts",
  "proxy.ts",
];

function fileExists(relPath) {
  return fs.existsSync(path.join(root, relPath));
}

function readFile(relPath) {
  return fs.readFileSync(path.join(root, relPath), "utf8");
}

test("F00 required files exist", () => {
  for (const relPath of expectedFiles) {
    assert.equal(fileExists(relPath), true, `Missing file: ${relPath}`);
  }
});

test("F00 env example includes required Supabase vars", () => {
  const envExample = readFile(".env.example");
  assert.match(envExample, /^NEXT_PUBLIC_SUPABASE_URL=/m);
  assert.match(envExample, /^NEXT_PUBLIC_SUPABASE_ANON_KEY=/m);
});

test("F00 session helper exposes a read-session function", () => {
  const sessionHelper = readFile("lib/auth/session.ts");
  assert.match(sessionHelper, /export\s+async\s+function\s+getCurrentSession/i);
});