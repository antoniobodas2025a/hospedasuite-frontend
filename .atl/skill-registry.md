# Skill Registry

**Delegator use only.** Any agent that launches sub-agents reads this registry to resolve compact rules, then injects them directly into sub-agent prompts. Sub-agents do NOT read this registry or individual SKILL.md files.

See `_shared/skill-resolver.md` for the full resolution protocol.

## User Skills

| Trigger | Skill | Path |
|---------|-------|------|
| when making a significant technical choice, comparing alternatives, choosing between libraries/frameworks/patterns, or when the orchestrator detects a decision point during development | adr | ~/.config/opencode/skills/adr/SKILL.md |
| when implementing a change, preparing commits, splitting PRs, or planning chained or stacked PRs | work-unit-commits | ~/.config/opencode/skills/work-unit-commits/SKILL.md |
| when drafting or posting feedback, review comments, maintainer replies, Slack messages, or GitHub comments | comment-writer | ~/.config/opencode/skills/comment-writer/SKILL.md |
| when writing guides, READMEs, RFCs, onboarding docs, architecture docs, or review-facing documentation | cognitive-doc-design | ~/.config/opencode/skills/cognitive-doc-design/SKILL.md |
| when a PR would exceed 400 changed lines, when planning chained PRs, stacked PRs, or reviewable slices | chained-pr | ~/.config/opencode/skills/chained-pr/SKILL.md |
| When creating a GitHub issue, reporting a bug, or requesting a feature | issue-creation | ~/.config/opencode/skills/issue-creation/SKILL.md |
| When creating a pull request, opening a PR, or preparing changes for review | branch-pr | ~/.config/opencode/skills/branch-pr/SKILL.md |
| When user asks to create a new skill, add agent instructions, or document patterns for AI | skill-creator | ~/.config/opencode/skills/skill-creator/SKILL.md |
| When writing Go tests, using teatest, or adding test coverage | go-testing | ~/.config/opencode/skills/go-testing/SKILL.md |
| When user says "judgment day", "judgment-day", "review adversarial", "dual review", "doble review", "juzgar", "que lo juzguen" | judgment-day | ~/.config/opencode/skills/judgment-day/SKILL.md |

## Compact Rules

Pre-digested rules per skill. Delegators copy matching blocks into sub-agent prompts as `## Project Standards (auto-resolved)`.

### adr
- Create ADR when choosing between 2+ viable options with real tradeoffs, not for trivial details or decisions already captured in SDD
- Run decision filter: (1) at least two viable options? (2) distinct pros/cons? (3) would someone not in this conversation benefit? All three = yes → create ADR
- Format: `docs/adr/{NNNN}-{slug}.md` with Y-Statement: "In the context of {situation}, facing {problem}, we decided for {option} to achieve {quality}, accepting {downside}"
- Status lifecycle: proposed → accepted → deprecated → superseded (link replacement)
- Always save to engram with topic_key `adr/{project}/{slug}` and type `decision`
- Reference ADR in commits: `ref: ADR-{NNNN}` in commit message

### work-unit-commits
- Commit by deliverable work unit, NOT by file type — a commit represents one behavior, fix, or doc
- Keep tests with the code they verify, docs with the feature they explain
- Each commit should be independently reviewable and rollback-safe
- Message explains WHY (outcome), not WHAT (file list)
- If SDD tasks forecast >400 lines, group commits into chained PR slices before implementation
- Pre-commit checklist: one clear purpose, repo makes sense after this commit only, tests/docs included, rollback is reasonable

### comment-writer
- Start with the actionable point, do not recap the whole PR before feedback
- Be warm and direct — sound like a thoughtful teammate, not a corporate bot
- Keep to 1-3 short paragraphs or a tight bullet list
- Explain the technical reason when asking for a change
- Match thread language (Rioplatense voseo in Spanish: podés, tenés, fijate, dale)
- No em dashes — use commas, periods, or parentheses

### cognitive-doc-design
- Lead with the answer: decision, action, or outcome first; context comes after
- Progressive disclosure: happy path first, then details, edge cases, references
- Chunking: group related info into small sections, keep flat lists short
- Signposting: headings, labels, callouts, summaries so readers know where they are
- Recognition over recall: prefer tables, checklists, examples, templates over dense prose
- For PRs: state what to review first, what is out of scope, link previous/next PR when chained

### chained-pr
- **MUST split** when PR exceeds **400 changed lines** (additions + deletions), unless maintainer-approved `size:exception`
- Design each PR for ≤60-minute human review
- Every chained PR MUST state: start, end, what came before, what comes next
- One deliverable work unit per PR — no mixing unrelated refactors, features, tests, or docs
- Include dependency diagram marking current PR with 📍 and a status table
- Feature Branch Chain: PR #1 targets tracker branch; later child PRs target immediate previous PR branch; tracker stays draft/no-merge until chain complete
- Stacked PRs to main: each PR merges to main in order; after parent merges, rebase child on main and retarget
- Diff is source of truth — if a child PR shows previous PR changes, its base is wrong; retarget/rebase

### issue-creation
- Blank issues disabled — MUST use template (bug_report.yml or feature_request.yml)
- Every issue gets `status:needs-review` automatically on creation
- Maintainer MUST add `status:approved` before any PR can be opened
- Questions go to Discussions, not issues
- Search existing issues for duplicates before creating
- Fill ALL required fields including pre-flight checkboxes

### branch-pr
- Every PR MUST link an approved issue (has `status:approved` label) — no exceptions
- Every PR MUST have exactly one `type:*` label
- Branch naming: `^(feat|fix|chore|docs|style|refactor|perf|test|build|ci|revert)/[a-z0-9._-]+$`
- PR body: Linked Issue (Closes #N), PR Type, Summary, Changes table, Test Plan, Contributor Checklist
- Conventional commits: `type(scope): description` — type must match PR type-label mapping
- No `Co-Authored-By` trailers in commits
- Automated checks must pass before merge

### skill-creator
- Create skill when a pattern is used repeatedly, project-specific conventions differ from generic best practices, or complex workflows need step-by-step instructions
- Structure: `skills/{skill-name}/SKILL.md` + optional `assets/` and `references/`
- Frontmatter required: name, description (includes Trigger:), license (Apache-2.0), metadata.author, metadata.version
- DO: start with critical patterns, use tables for decisions, keep examples minimal, include Commands section
- DON'T: add Keywords section, duplicate existing docs, use web URLs in references, add troubleshooting sections
- After creation, register in AGENTS.md

### go-testing
- Table-driven tests for pure functions: `tests []struct{name, input, expected, wantErr}` + `t.Run(tt.name, ...)`
- Bubbletea: test Model.Update() directly with `tea.KeyMsg` for state transitions; use teatest for full TUI flows
- Golden file testing: save output to `testdata/*.golden`, compare in tests, use `-update` flag to regenerate
- File organization: `*_test.go` alongside source; `testdata/` for golden files and fixtures
- Mock system dependencies via interfaces, use `t.TempDir()` for temp files
- Test both success and error cases; test edge cases (bounds, empty, nil)

### judgment-day
- Launch TWO blind judge sub-agents in parallel via `delegate` (async) — NEVER sequential, NEVER the orchestrator reviews
- Both judges receive identical target and criteria, neither knows about the other
- Each judge returns: severity (CRITICAL | WARNING real | WARNING theoretical | SUGGESTION), file:line, description, suggested fix
- Synthesize verdict table: Confirmed (both), Suspect (one side), Contradiction (disagree)
- After fixes: re-launch both judges in parallel for re-judgment
- After 2 fix iterations, ASK user before continuing — never escalate automatically
- WARNING classification: "Can a normal user trigger this?" YES → real (fix required), NO → theoretical (report as INFO, do not fix)
- Never APPROVED until: Round 1 judges return CLEAN, OR Round 2 confirms 0 CRITICALs + 0 real WARNINGs

## Project Conventions

| File | Path | Notes |
|------|------|-------|
| AGENTS.md | — | Not found (project-level) |
| CLAUDE.md | — | Not found (project-level) |
| .cursorrules | — | Not found (project-level) |
| GEMINI.md | — | Not found (project-level) |
| copilot-instructions.md | — | Not found (project-level) |

No project-level convention files found. Project uses OpenCode with standard Gentle AI conventions.
