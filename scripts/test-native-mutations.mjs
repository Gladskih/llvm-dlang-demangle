import assert from "node:assert/strict";
import { readFile, writeFile } from "node:fs/promises";
import { execFileSync } from "node:child_process";
import { createDemangler } from "../dist/node.js";

// Pinned upstream examples plus RFC 2603 grammar cases. AST values are checked
// independently in test/structured.test.mjs before this native/WASM comparison.
const examples = ["_D8demangle4testZ","_D3foozi","_D8demangle3ABCQe1ai","_D8demangle4ABCi1aQd"];
const mutations = [["Trace.field(\"value\", std::string(Mangled.substr(0, Len)));","Trace.field(\"value\", \"incorrect\");",1],["Trace.field(\"targetOffset\", std::to_string(Trace.position(Ret)));","Trace.field(\"targetOffset\", std::to_string(Trace.position(Ret) + 1));",1],["Trace.field(\"value\", std::to_string(Val));","Trace.field(\"value\", std::to_string(Val + 1));",2],["std::string(Mangled.substr(0, std::string_view(\"zN\").find(Mangled.front()) != std::string_view::npos ? 2 : 1))","std::string(1, Mangled.front())",1]];
const api = await createDemangler();
const expected = examples.map(name => api.demangle(name));
assert(expected.every(result => result.status === "success"));
const original = await readFile(".build/parser.cpp", "utf8");

function nativeResults() {
  execFileSync("clang++", ["-std=c++17", "-O0", "-I", ".build/guarded", "-I", ".build/llvm/llvm/include",
    "-I", "native", "native/bridge.cpp", "native/ast-oracle.cpp", ".build/mutated-parser.cpp",
    "-o", ".build/mutated-oracle"], { stdio: "pipe" });
  return execFileSync(".build/mutated-oracle", { input: examples.join("\n") + "\n", encoding: "utf8" })
    .trimEnd().split("\n").map(line => JSON.parse(line));
}

await writeFile(".build/mutated-parser.cpp", original);
assert.deepEqual(nativeResults(), expected, "Native/WASM AST baseline mismatch");
for (const [before, after, occurrences] of mutations) {
  assert.equal(original.split(before).length, occurrences + 1, "Missing mutation target: " + before);
  await writeFile(".build/mutated-parser.cpp", original.replaceAll(before, after));
  assert.notDeepEqual(nativeResults(), expected, "Surviving native semantic mutation: " + before);
}
console.warn("Killed " + mutations.length + "/" + mutations.length + " native semantic mutations.");
