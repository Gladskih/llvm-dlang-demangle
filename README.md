# llvm-dlang-demangle

Local LLVM D demangling with a structured parse tree, compiled to WebAssembly.
Works in Node.js 24+, browsers and module workers without runtime dependencies.

```js
import { createDemangler } from "llvm-dlang-demangle";

const api = await createDemangler();
const result = api.demangle("_D8demangle4testZ");
// { status: "success", ast: { root: 0, nodes: [...] }, warnings: [] }

result.ast.nodes.filter(node => node.kind === "IdentifierValue").map(node => node.value);
// ["demangle", "test"]

api.demangleWithText("_D8demangle4testZ").text;
// "demangle.test"
```

Initialization is asynchronous; both methods are synchronous afterwards.
`demangle` captures parser structure and semantic values without constructing output
text. `demangleWithText` captures the identical tree and LLVM presentation in one
traversal. Input is parsed once per call; original LLVM backreference visits remain.

The upstream Rust/D parsers have no native AST. This package instruments their
actual grammar operations; its tree is a wrapper-defined, revision-scoped parse tree,
with generated TypeScript declarations and an exported `ast-schema.json`.
It is not a reconstruction from a demangled string.

An AST has `root` (an index) and flat `nodes`. Each node has a typed `kind`,
`children` in grammar order, and half-open `start`/`end` byte offsets into the
original UTF-8 mangled input. Ranges may overlap when LLVM revisits a backreference.
An omitted optional production can have an empty range. Backreference target offsets
are absolute byte offsets represented as exact decimal strings. Child IDs always
follow their parent, so graph traversal does not require recursive object walking.

D nodes distinguish qualified names, identifiers, identifier values, basic types,
special symbols, decimal lengths and identifier/type backreferences. `Type.code`
preserves the complete ABI code (including `zi`, `zk`, `Nn`). Special identifiers
retain a `special` classification such as `VTable` or `ClassInfo`.
Lengths and backreference distances are exact decimal strings.

Invalid names return `{ status: "invalid", ast: null, warnings: [...] }`.
Formatted failures additionally contain `text: null`; analysis results have no
`text` property. Allocation failures return `limit`. A fatal WASM trap returns
`error` and quarantines that instance: create a new demangler to continue.
Returned trees are detached plain objects. Loading/compilation failures reject initialization.

Only well-formed Unicode strings without control characters are accepted.
No wrapper input, depth, tree or output policy caps are imposed; WASM address-space,
memory and stack limits apply. LLVM D support is incomplete: functions, templates,
qualifiers, compound types, delegates and tuples remain upstream TODOs. For example,
`_D3foo3barFiZi` returns `invalid`.

For a bundler such as Vite, pass the emitted local WASM asset URL:

```js
import { createDemangler } from "llvm-dlang-demangle";
import wasmURL from "llvm-dlang-demangle/llvm-dlang-demangle.wasm?url";
const api = await createDemangler({ wasmURL });
```

Pass `{ wasmBinary: Uint8Array }` for fully offline initialization. Bytes take
precedence over `wasmURL`. Node defaults to the adjacent packaged file; browsers
fetch that asset from your application. CSP needs
`script-src 'self' 'wasm-unsafe-eval'; connect-src 'self'; worker-src 'self'`.

Source commits, SHA-256 hashes and Emscripten version are pinned in `upstream.json`.
Build on Linux/WSL. `EMSDK_ROOT` can select an SDK at the exact pinned commit/version.
See [CONTRIBUTING.md](CONTRIBUTING.md) and [VERIFICATION.md](VERIFICATION.md).
`npm run upstream:update -- <llvm-tag-or-commit>` refreshes checksums; review the
instrumentation and generated schema, then run all gates before accepting an update.

Exports include `llvm-dlang-demangle/ast-schema.json` and
`llvm-dlang-demangle/build-info.json`. Wrapper code is MIT; LLVM and runtime
notices are in [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md).

References: [pinned LLVM parser](https://github.com/llvm/llvm-project/blob/0d261d1ca552c95a8f007e061c787ac7132fbcbc/llvm/lib/Demangle/DLangDemangle.cpp),
[D ABI](https://dlang.org/spec/abi.html#name_mangling).
