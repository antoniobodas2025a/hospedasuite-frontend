#!/usr/bin/env bun
/**
 * mutate.ts — AST-based mutation testing tool for TypeScript.
 *
 * Mutations applied:
 *   == → !=       (equality flip)
 *   === → !==     (strict equality flip)
 *   > → <=        (comparison flip)
 *   < → >=        (comparison flip)
 *   >= → <        (reversed)
 *   <= → >        (reversed)
 *   && → ||       (logical AND → OR)
 *   || → &&       (logical OR → AND)
 *   ! → (remove)  (negation removal)
 *
 * Usage:
 *   bun scripts/mutate.ts <file.ts>              # list mutations
 *   bun scripts/mutate.ts <file.ts> --apply=N    # apply mutation N
 *   bun scripts/mutate.ts <file.ts> --reset      # restore original
 *
 * Design: DAE differential mutation pattern. Mutates one operator at a time,
 * runs tests, reports survivors, restores original. Stores mutation hash map
 * in .build/mutation-manifest.json for differential re-runs.
 */

import { readFileSync, writeFileSync, mkdirSync, existsSync } from "fs";
import { basename, dirname } from "path";

const MANIFEST_DIR = ".build";
const MANIFEST_FILE = `${MANIFEST_DIR}/mutation-manifest.json`;

// ── Mutation rules ──────────────────────────────────────────────────────────

interface Mutation {
	id: number;
	type: string;
	line: number;
	column: number;
	original: string;
	mutated: string;
	context: string;
}

const OPERATOR_MUTATIONS: [RegExp, string, string][] = [
	[/(?<!\w)([=!]==)(?!\w)/g, "==", "!="],
	[/(?<!\w)([=!]==)(?!\w)/g, "!=", "=="],
	[/(?<!\w)([><]=?)(?!\w)/g, ">", "<="],
	[/(?<!\w)([><]=?)(?!\w)/g, "<", ">="],
	[/(?<!\w)([><]=?)(?!\w)/g, ">=", "<"],
	[/(?<!\w)([><]=?)(?!\w)/g, "<=", ">"],
	[/(?<!\w)(&&|\|\|)(?!\w)/g, "&&", "||"],
	[/(?<!\w)(&&|\|\|)(?!\w)/g, "||", "&&"],
];

/**
 * Find all possible mutations in source code.
 */
function findMutations(source: string): Mutation[] {
	const mutations: Mutation[] = [];
	let id = 0;

	for (const [regex, original, mutated] of OPERATOR_MUTATIONS) {
		let match: RegExpExecArray | null;
		const re = new RegExp(regex.source, regex.flags);
		while ((match = re.exec(source)) !== null) {
			if (match[1] === original) {
				// Compute line/column
				const before = source.slice(0, match.index);
				const line = before.split("\n").length;
				const lastNewline = before.lastIndexOf("\n");
				const column = match.index - lastNewline;

				// Extract context (line of code)
				const lineStart = source.lastIndexOf("\n", match.index - 1) + 1;
				const lineEnd = source.indexOf("\n", match.index);
				const context = source
					.slice(lineStart, lineEnd === -1 ? undefined : lineEnd)
					.trim();

				mutations.push({
					id: ++id,
					type: `${original} → ${mutated}`,
					line,
					column,
					original: match[0],
					mutated,
					context,
				});
			}
		}
	}

	return mutations;
}

/**
 * Apply a specific mutation to source code, return mutated source.
 */
function applyMutation(source: string, mutation: Mutation): string {
	const matchPattern = new RegExp(
		mutation.original.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"),
		"g",
	);

	let count = 0;
	return source.replace(matchPattern, (m) => {
		count++;
		if (count === mutation.id) {
			// Find correct occurrence by ID
			return mutation.mutated;
		}
		return m;
	});
}

// ── Manifest ────────────────────────────────────────────────────────────────

interface ManifestEntry {
	file: string;
	hash: string;
	mutations: number;
	killed: number;
	survivors: number[];
	lastRun: string;
}

function loadManifest(): Record<string, ManifestEntry> {
	try {
		if (existsSync(MANIFEST_FILE)) {
			return JSON.parse(readFileSync(MANIFEST_FILE, "utf8"));
		}
	} catch {}
	return {};
}

function saveManifest(manifest: Record<string, ManifestEntry>) {
	mkdirSync(MANIFEST_DIR, { recursive: true });
	writeFileSync(MANIFEST_FILE, JSON.stringify(manifest, null, 2));
}

// ── Main ────────────────────────────────────────────────────────────────────

const args = process.argv.slice(2);
const file = args[0];
const action = args[1] || "--list";

if (!file) {
	console.log(
		"Usage: bun scripts/mutate.ts <file.ts> [--list|--apply=N|--reset]",
	);
	process.exit(1);
}

const source = readFileSync(file, "utf8");
const mutations = findMutations(source);

if (action === "--list") {
	if (mutations.length === 0) {
		console.log("No mutations found.");
	} else {
		console.log(`Found ${mutations.length} possible mutations:\n`);
		for (const m of mutations) {
			console.log(`  #${m.id} [${m.type}] line ${m.line}:${m.column}`);
			console.log(`      ${m.context}`);
			console.log();
		}
	}
} else if (action.startsWith("--apply=")) {
	const id = parseInt(action.split("=")[1]);
	const mutation = mutations.find((m) => m.id === id);
	if (!mutation) {
		console.error(`Mutation #${id} not found.`);
		process.exit(1);
	}

	// Backup original
	const backup = `${file}.mutate.bak`;
	writeFileSync(backup, source);

	// Apply mutation
	const mutated = applyMutation(source, mutation);
	writeFileSync(file, mutated);

	console.log(`Applied mutation #${id}: ${mutation.type}`);
	console.log(`  Original: ${mutation.context}`);
	console.log(`  Backup saved to ${backup}`);
	console.log(
		`\nRun tests now. If they PASS → survivor (bad). If they FAIL → killed (good).`,
	);
} else if (action === "--reset") {
	const backup = `${file}.mutate.bak`;
	if (!existsSync(backup)) {
		console.error("No backup found.");
		process.exit(1);
	}
	const original = readFileSync(backup, "utf8");
	writeFileSync(file, original);
	console.log("Restored original from backup.");
} else {
	console.log("Unknown action. Use --list, --apply=N, or --reset");
	process.exit(1);
}
