import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

const requiredApiFiles = [
  "app/auth/login/route.ts",
  "app/auth/logout/route.ts",
  "app/api/dashboard/metrics/route.ts",
  "app/api/users/route.ts",
  "app/api/users/[id]/route.ts",
  "app/api/subscriptions/route.ts",
  "app/api/subscriptions/[id]/status/route.ts",
  "app/api/subscriptions/[id]/terminate/route.ts",
  "app/api/audit/route.ts",
  "app/api/settings/route.ts",
];

test("API contract files required by architecture exist", () => {
  for (const relPath of requiredApiFiles) {
    const fullPath = path.join(process.cwd(), relPath);
    assert.equal(fs.existsSync(fullPath), true, `Missing ${relPath}`);
  }
});

test("dashboard data contract includes revenue block", () => {
  const filePath = path.join(process.cwd(), "lib/data/dashboard.ts");
  assert.equal(fs.existsSync(filePath), true, "Missing lib/data/dashboard.ts");
  const source = fs.readFileSync(filePath, "utf8");
  assert.match(source, /computeDashboardRevenue\(/i);
  assert.match(source, /return\s+\{\s*kpis,\s*alerts,\s*recentActivity,\s*revenue\s*\}/i);
});
