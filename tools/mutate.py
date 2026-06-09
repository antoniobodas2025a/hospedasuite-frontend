#!/usr/bin/env python3
"""
Mutation Tester for HospedaSuite — TDD Kill Rate Validator.

Applies mutation operators to TypeScript source files and runs tests
to verify that the test suite catches every mutation (Kill Rate = 100%).

Mutation Operators:
  1. Logical inversion: < → >, > → <, <= → >=, >= → <=
  2. Boolean connectors: && → ||, || → &&
  3. Constant alteration: true → false, false → true
  4. Arithmetic: + → -, - → +, * → /

Usage:
  python3 tools/mutate.py --target src/lib/pricing.ts --test "npm run test"
  python3 tools/mutate.py --target src/lib/checkout-schemas.ts --test "npx vitest run src/__tests__/unit/checkout-schemas.test.ts"
  python3 tools/mutate.py --target src/lib/ --test "npm run test" --recursive

Output:
  Kill Rate report with killed/survived mutations.
  Exit code 0 if Kill Rate = 100%, exit code 1 otherwise.
"""

import argparse
import os
import re
import subprocess
import sys
import shutil
import tempfile
from pathlib import Path
from dataclasses import dataclass, field
from typing import List, Tuple, Optional


@dataclass
class Mutation:
    """Represents a single mutation of the source code."""
    file_path: str
    line_number: int
    column: int
    original: str
    mutated: str
    operator: str
    killed: bool = False
    test_output: str = ""


@dataclass
class MutationReport:
    """Aggregated results of a mutation testing run."""
    total_mutations: int = 0
    killed: int = 0
    survived: int = 0
    mutations: List[Mutation] = field(default_factory=list)

    @property
    def kill_rate(self) -> float:
        if self.total_mutations == 0:
            return 1.0
        return self.killed / self.total_mutations


# ── Mutation Operators ────────────────────────────────────────────────────────

# Operator 1: Logical comparisons
LOGICAL_MUTATIONS = [
    (r'(?<!\w)(<)(?!=)', '>', 'logical_invert'),
    (r'(?<!\w)(>)(?!=)', '<', 'logical_invert'),
    (r'(?<!\w)(<=)', '>=', 'logical_invert'),
    (r'(?<!\w)(>=)', '<=', 'logical_invert'),
    (r'(?<!\w)(===)', '!==', 'logical_invert'),
    (r'(?<!\w)(!==)', '===', 'logical_invert'),
    (r'(?<!\w)(==)', '!=', 'logical_invert'),
    (r'(?<!\w)(!=)', '==', 'logical_invert'),
]

# Operator 2: Boolean connectors
BOOLEAN_MUTATIONS = [
    (r'(?<!\w)(&&)(?!=)', '||', 'boolean_invert'),
    (r'(?<!\w)(\|\|)', '&&', 'boolean_invert'),
]

# Operator 3: Constants
CONSTANT_MUTATIONS = [
    (r'(?<!\w)(true)(?!\w)', 'false', 'constant_invert'),
    (r'(?<!\w)(false)(?!\w)', 'true', 'constant_invert'),
]

# Operator 4: Arithmetic (only in calculation functions)
ARITHMETIC_MUTATIONS = [
    (r'(?<!\w)(\+)(?!=|\+|>)', '-', 'arithmetic_invert'),
    (r'(?<!\w)(\*)(?!\*)', '/', 'arithmetic_invert'),
]

ALL_OPERATORS = (
    LOGICAL_MUTATIONS + BOOLEAN_MUTATIONS +
    CONSTANT_MUTATIONS + ARITHMETIC_MUTATIONS
)


def find_mutations(file_content: str, file_path: str) -> List[Mutation]:
    """Find all possible mutations in a file."""
    mutations = []
    lines = file_content.split('\n')

    for line_idx, line in enumerate(lines):
        # Skip comments and strings for safety
        stripped = line.strip()
        if stripped.startswith('//') or stripped.startswith('*') or stripped.startswith('/*'):
            continue

        for pattern, replacement, operator in ALL_OPERATORS:
            for match in re.finditer(pattern, line):
                # Skip mutations inside string literals
                before_match = line[:match.start()]
                # Simple heuristic: count quotes before match
                if before_match.count('"') % 2 == 1 or before_match.count("'") % 2 == 1:
                    continue

                mutations.append(Mutation(
                    file_path=file_path,
                    line_number=line_idx + 1,
                    column=match.start(),
                    original=match.group(),
                    mutated=replacement,
                    operator=operator,
                ))

    return mutations


def apply_mutation(file_content: str, mutation: Mutation) -> str:
    """Apply a single mutation to the file content."""
    lines = file_content.split('\n')
    line_idx = mutation.line_number - 1
    line = lines[line_idx]
    # Replace only the specific occurrence
    lines[line_idx] = (
        line[:mutation.column] +
        mutation.mutated +
        line[mutation.column + len(mutation.original):]
    )
    return '\n'.join(lines)


def run_tests(test_command: str) -> Tuple[bool, str]:
    """Run the test command and return (passed, output)."""
    try:
        result = subprocess.run(
            test_command,
            shell=True,
            capture_output=True,
            text=True,
            timeout=120,
        )
        return result.returncode == 0, result.stdout + result.stderr
    except subprocess.TimeoutExpired:
        return False, "Test command timed out"
    except Exception as e:
        return False, str(e)


def run_mutation_testing(
    target: str,
    test_command: str,
    recursive: bool = False,
) -> MutationReport:
    """Run mutation testing on the target file(s)."""
    report = MutationReport()

    # Collect files
    target_path = Path(target)
    if target_path.is_dir() and recursive:
        files = list(target_path.glob('**/*.ts'))
        files = [f for f in files if '.test.' not in str(f) and 'node_modules' not in str(f)]
    elif target_path.is_file():
        files = [target_path]
    else:
        print(f"Error: Target {target} not found")
        return report

    # First, verify tests pass on clean code
    print("🔍 Verifying tests pass on clean code...")
    clean_passed, clean_output = run_tests(test_command)
    if not clean_passed:
        print("❌ Tests fail on clean code. Fix tests before running mutation testing.")
        print(clean_output[-500:])
        return report
    print("✅ Tests pass on clean code.\n")

    # Run mutations
    for file_path in files:
        file_str = str(file_path)
        print(f"🧬 Mutating: {file_str}")

        with open(file_str, 'r') as f:
            original_content = f.read()

        mutations = find_mutations(original_content, file_str)
        print(f"   Found {len(mutations)} mutation points")

        for i, mutation in enumerate(mutations):
            mutated_content = apply_mutation(original_content, mutation)

            # Write mutated file
            with open(file_str, 'w') as f:
                f.write(mutated_content)

            # Run tests
            passed, output = run_tests(test_command)

            # Restore original
            with open(file_str, 'w') as f:
                f.write(original_content)

            mutation.killed = not passed
            mutation.test_output = output[-200:] if not passed else ""
            report.mutations.append(mutation)
            report.total_mutations += 1

            if mutation.killed:
                report.killed += 1
                status = "💀 KILLED"
            else:
                report.survived += 1
                status = "🧟 SURVIVED"

            print(f"   [{i+1}/{len(mutations)}] {status} "
                  f"L{mutation.line_number}: {mutation.original} → {mutation.mutated} "
                  f"({mutation.operator})")

        print()

    return report


def print_report(report: MutationReport):
    """Print the mutation testing report."""
    print("=" * 60)
    print("📊 MUTATION TESTING REPORT")
    print("=" * 60)
    print(f"Total mutations: {report.total_mutations}")
    print(f"💀 Killed:   {report.killed}")
    print(f"🧟 Survived: {report.survived}")
    print(f"Kill Rate:   {report.kill_rate:.0%}")
    print()

    if report.survived > 0:
        print("⚠️  SURVIVING MUTATIONS (tests need improvement):")
        for m in report.mutations:
            if not m.killed:
                print(f"   - {m.file_path}:{m.line_number} "
                      f"{m.original} → {m.mutated} ({m.operator})")
        print()

    if report.kill_rate == 1.0:
        print("✅ Kill Rate 100% — Test suite is robust!")
    else:
        print(f"❌ Kill Rate {report.kill_rate:.0%} — Below 100% target.")
        print("   Add tests that detect the surviving mutations.")


def main():
    parser = argparse.ArgumentParser(description="Mutation Tester for HospedaSuite")
    parser.add_argument("--target", required=True, help="File or directory to mutate")
    parser.add_argument("--test", default="npm run test", help="Test command to run")
    parser.add_argument("--recursive", action="store_true", help="Recurse into directories")
    args = parser.parse_args()

    report = run_mutation_testing(
        target=args.target,
        test_command=args.test,
        recursive=args.recursive,
    )

    print_report(report)

    # Exit code: 0 if Kill Rate = 100%, 1 otherwise
    sys.exit(0 if report.kill_rate == 1.0 else 1)


if __name__ == "__main__":
    main()
