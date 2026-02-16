import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

const migrationPath = path.join(
  process.cwd(),
  "supabase",
  "migrations",
  "202602130001_initial_schema.sql",
);
const seedPath = path.join(process.cwd(), "supabase", "seed.sql");

function readFileOrEmpty(filePath) {
  return fs.existsSync(filePath) ? fs.readFileSync(filePath, "utf8") : "";
}

test("F01 schema migration exists and defines required v1 tables", () => {
  assert.equal(
    fs.existsSync(migrationPath),
    true,
    `Expected migration file at ${migrationPath}`,
  );

  const sql = readFileOrEmpty(migrationPath);
  assert.match(sql, /create table if not exists public\.users/i);
  assert.match(sql, /create table if not exists public\.subscriptions/i);
  assert.match(sql, /create table if not exists public\.audit_logs/i);
  assert.match(sql, /create table if not exists public\.app_settings/i);
  assert.match(
    sql,
    /check \(status in \('activa','gracia','suspendida','terminada'\)\)/i,
  );
  assert.match(sql, /unique\s*\(whatsapp\)/i);
  assert.match(sql, /unique\s*\(user_id\)/i);
});

test("F01 seed exists and seeds app_settings defaults", () => {
  assert.equal(fs.existsSync(seedPath), true, `Expected seed file at ${seedPath}`);

  const sql = readFileOrEmpty(seedPath);
  assert.match(sql, /insert into public\.app_settings/i);
  assert.match(sql, /'America\/Argentina\/Buenos_Aires'/i);
  assert.match(sql, /'DD\/MM\/YYYY'/i);
  assert.doesNotMatch(sql, /\bcurrency\b/i);
});
