import { readdirSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const repoRoot = resolve(
  dirname(fileURLToPath(import.meta.url)),
  "../../../..",
);
const migrationsDir = join(repoRoot, "supabase", "migrations");

const migrationSql = readdirSync(migrationsDir)
  .filter((fileName) => fileName.endsWith(".sql"))
  .sort()
  .map((fileName) => readFileSync(join(migrationsDir, fileName), "utf8"))
  .join("\n")
  .toLowerCase()
  .replaceAll(/\s+/g, " ");

const dataApiGrants = [
  {
    table: "profiles",
    grants: [
      {
        privileges: "select, insert, update, delete",
        role: "authenticated",
      },
      {
        privileges: "select, insert, update, delete",
        role: "service_role",
      },
    ],
  },
  {
    table: "feed_configs",
    grants: [
      { privileges: "select", role: "anon" },
      {
        privileges: "select, insert, update, delete",
        role: "authenticated",
      },
      {
        privileges: "select, insert, update, delete",
        role: "service_role",
      },
    ],
  },
  {
    table: "share_links",
    grants: [
      { privileges: "select", role: "anon" },
      {
        privileges: "select, insert, update, delete",
        role: "authenticated",
      },
      {
        privileges: "select, insert, update, delete",
        role: "service_role",
      },
    ],
  },
  {
    table: "viewer_sessions",
    grants: [
      { privileges: "select", role: "anon" },
      {
        privileges: "select, insert, update, delete",
        role: "authenticated",
      },
      {
        privileges: "select, insert, update, delete",
        role: "service_role",
      },
    ],
  },
  {
    table: "viewer_templates",
    grants: [
      { privileges: "select", role: "anon" },
      {
        privileges: "select, insert, update, delete",
        role: "authenticated",
      },
      {
        privileges: "select, insert, update, delete",
        role: "service_role",
      },
    ],
  },
] as const;

describe("Supabase Data API grants", () => {
  it("documents explicit table grants for Data API roles", () => {
    for (const { table, grants } of dataApiGrants) {
      for (const { privileges, role } of grants) {
        const grant = `grant ${privileges} on table public.${table} to ${role};`;

        expect(migrationSql, grant).toContain(grant);
      }
    }
  });
});
