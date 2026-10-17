# Verification and contribution audit

Validated locally on 2026-10-17 with Windows Node 24.19.0 and Linux/WSL Node 26.11.1.
LLVM and Emscripten inputs remain immutable and checksummed in upstream.json.

- npm ci and the pinned Emscripten WASM build succeed.
- ESLint and strict TypeScript checks pass; runtime JS line/branch/function coverage is 100%.
- All 21 JS mutations and 4 compiled native semantic mutations are detected per package.
- 56 independent upstream expectations pass (FileCheck whitespace semantics for lit tests).
- 1133 valid/malformed names match unmodified native LLVM status and presentation.
  Both API modes also return identical trees for this corpus. Every successful tree
  is checked against the generated schema, UTF-8 bounds, child IDs and tree connectivity.
- Exact independent grammar expectations cover node hierarchy, semantic values and byte ranges.
  D checks multi-byte type codes, UTF-8 identifiers, backreferences and zero-output rejection.
- Native arithmetic, UTF-8, JSON, buffer ownership, graph/scopes, output-suppression
  and malformed-corpus tests pass ASan/UBSan with leak detection.
- Browser tests pass under strict CSP, with offline bytes, module workers and equal
  structured trees in analysis and formatted modes.
- The exact release tarball is installed and exercised on Windows and Linux.

The final CONTRIBUTING.md audit checks cohesive modules, small functions, double
quotes, explicit configuration, no boolean control parameters or argument bags,
no repeated top-level parsing, plain detached results, visible diagnostics,
bounds-checked ranges/arithmetic, fail-closed patch anchors and grammar-tag checks,
revision-scoped TypeScript/schema generation and complete license packaging.

The upstream parsers have no native AST. Structure is captured from their grammar
operations and semantic values during the original parse, without reparsing output.
Analysis omits presentation-buffer construction; Rust still validates Punycode and
backreferences as upstream does. Its temporary Punycode decoding is semantic validation.
D maintains virtual output positions needed by the parser without materializing text.
Original LLVM backreference visits remain part of its algorithm; nodes may have
overlapping ranges and backreference descendants may refer to earlier input bytes.

No runtime external services or dependencies are added. No wrapper resource-policy
caps are added. Allocation failures produce diagnostics; fatal WASM traps quarantine
an instance. D retains upstream's incomplete grammar and ASCII-safe character classification.
These finite checks are evidence, not proof for every possible malformed input.

Hosted CI is configured for Linux builds and Windows/Linux Node 24/26 consumers;
it has not been executed for these local repositories. GitHub/npm publication has
not been performed.
