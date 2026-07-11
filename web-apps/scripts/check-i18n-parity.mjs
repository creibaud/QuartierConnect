#!/usr/bin/env node
// Fails (exit 1) when the FR and EN locale leaf-key sets diverge or when any
// value is an empty string. The locales are `.ts` modules (`export default
// {...} as const`); we strip the TS-only assertion and import them as plain
// ESM so the check runs on any Node >= 20 without extra tooling.
import { readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = dirname(fileURLToPath(import.meta.url));
const localeDir = resolve(scriptDir, "../packages/shared/src/lib/i18n");

async function loadLocale(name) {
    const source = await readFile(resolve(localeDir, `${name}.ts`), "utf8");
    const asJs = source.replace(/\bas const\b/g, "");
    const url = `data:text/javascript;base64,${Buffer.from(asJs, "utf8").toString("base64")}`;
    const module = await import(url);
    return module.default;
}

function flattenLeaves(value, prefix, out) {
    for (const [key, child] of Object.entries(value)) {
        const path = prefix ? `${prefix}.${key}` : key;
        if (child !== null && typeof child === "object") {
            flattenLeaves(child, path, out);
        } else {
            out.set(path, child);
        }
    }
    return out;
}

function difference(a, b) {
    return [...a].filter((key) => !b.has(key)).sort();
}

function emptyValueKeys(locale, leaves) {
    const empties = [];
    for (const [key, value] of leaves) {
        if (typeof value === "string" && value.trim() === "") {
            empties.push(`${locale}: ${key}`);
        }
    }
    return empties;
}

function reportSection(label, keys) {
    if (keys.length === 0) return false;
    console.error(`\n${label} (${keys.length}):`);
    for (const key of keys) console.error(`  - ${key}`);
    return true;
}

const [fr, en] = await Promise.all([loadLocale("fr"), loadLocale("en")]);
const frLeaves = flattenLeaves(fr, "", new Map());
const enLeaves = flattenLeaves(en, "", new Map());
const frKeys = new Set(frLeaves.keys());
const enKeys = new Set(enLeaves.keys());

const missingInEn = difference(frKeys, enKeys);
const missingInFr = difference(enKeys, frKeys);
const empties = [
    ...emptyValueKeys("fr", frLeaves),
    ...emptyValueKeys("en", enLeaves),
];

let failed = false;
failed =
    reportSection("Keys present in FR but missing from EN", missingInEn) ||
    failed;
failed =
    reportSection("Keys present in EN but missing from FR", missingInFr) ||
    failed;
failed = reportSection("Empty string values", empties) || failed;

if (failed) {
    console.error("\ni18n parity check FAILED.");
    process.exit(1);
}

console.log(
    `i18n parity OK — ${frKeys.size} leaf keys, FR and EN in sync, no empty values.`,
);
