# llvm-dlang-demangle

LLVM DLang symbol demangling compiled to WebAssembly. Runs entirely locally in
Node.js 24+ and modern browsers, including module workers, with no runtime dependencies.

```js
import { createDemangler } from "llvm-dlang-demangle";

const demangler = await createDemangler();
demangler.demangle("_D8demangle4testZ");
// { status: "success", text: "demangle.test", warnings: [] }
```

Initialization is asynchronous; demangling is synchronous. Results are detached plain
objects. Invalid names return `{ status: "invalid", text: null, warnings: [...] }`.
Allocation failures return `limit`; fatal WASM failures return `error` and require
creating a fresh instance. Loading/compilation failures reject initialization.
No AST or type-only API: upstream DLang parses directly to text.

For bundlers, pass the emitted asset URL explicitly:

```js
import { createDemangler } from "llvm-dlang-demangle";
import wasmURL from "llvm-dlang-demangle/llvm-dlang-demangle.wasm?url";
const demangler = await createDemangler({ wasmURL });
```

Pass `{ wasmBinary: Uint8Array }` to initialize fully offline without fetch.
`wasmBinary` takes precedence over `wasmURL`. Node defaults to the adjacent local
WASM file; browsers fetch that asset from your own application. CSP needs
`script-src 'self' 'wasm-unsafe-eval'; connect-src 'self'; worker-src 'self'`.

Only well-formed Unicode strings without control characters are accepted.
The wrapper has no input/output size policy caps. Actual WASM memory/stack limits
still apply. LLVM's D demangler supports the subset exercised by its pinned tests; this is
not a claim of complete support for the D ABI. Deep recursion can exhaust the WASM stack.

Sources, SHA-256 hashes and Emscripten version are pinned in `upstream.json`.
See [CONTRIBUTING.md](CONTRIBUTING.md) for build and verification commands.
`EMSDK_ROOT` may point to an installed SDK at the exact pinned commit/version.
Build on Linux/WSL. Windows and Linux can consume the resulting npm package.
`npm run upstream:update -- <llvm-tag-or-commit>` refreshes source pins; review
source changes, safety adaptations, corpora and all gates before accepting an update.

Build metadata is exported as `llvm-dlang-demangle/build-info.json`.
Wrapper: MIT. LLVM and linked runtime notices: see [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md).
