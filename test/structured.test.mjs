import assert from "node:assert/strict";
import { test } from "node:test";
import { createDemangler } from "../dist/node.js";

const api = await createDemangler();

test("analysis exposes a source-backed tree without text; formatting parses the same tree", () => {
  const analysis = api.demangle("_D8demangle4testZ");
  const formatted = api.demangleWithText("_D8demangle4testZ");
  assert.equal(analysis.status, "success");
  assert(!Object.hasOwn(analysis, "text"));
  assert.equal(formatted.text, "demangle.test");
  assert.deepEqual(formatted.ast, analysis.ast);
  assert.equal(analysis.ast.root, 0);
  assert.equal(analysis.ast.nodes[0].kind, "Symbol");
  assert.equal(analysis.ast.nodes[0].start, 0);
  assert.equal(analysis.ast.nodes[0].end, "_D8demangle4testZ".length);
});

test("failures expose no partial tree and formatted failures expose null text", () => {
  assert.deepEqual(api.demangle(null), { status: "invalid", ast: null, warnings: ["Expected a string."] });
  assert.equal(api.demangleWithText("?").ast, null);
  assert.equal(api.demangleWithText("?").text, null);
  assert.equal(api.demangleWithText(null).text, null);
});

// Independent grammar expansion: D ABI MangledName, QualifiedName and Identifier.
test("captures exact rule hierarchy, names and byte ranges", () => {
  assert.deepEqual(api.demangle("_D8demangle4testZ").ast, { root: 0, nodes: [
    {kind: "Symbol", start: 0, end: 17, children: [1]},
    {kind: "MangledName", start: 0, end: 17, children: [2]},
    {kind: "QualifiedName", start: 2, end: 16, children: [3, 6]},
    {kind: "Identifier", start: 2, end: 11, children: [4, 5]},
    {kind: "DecimalNumber", start: 2, end: 3, children: [], value: "8"},
    {kind: "IdentifierValue", start: 3, end: 11, children: [], value: "demangle"},
    {kind: "Identifier", start: 11, end: 16, children: [7, 8]},
    {kind: "DecimalNumber", start: 11, end: 12, children: [], value: "4"},
    {kind: "IdentifierValue", start: 12, end: 16, children: [], value: "test"},
  ] });
});

test("distinguishes multi-byte basic type codes and preserves UTF-8 byte ranges", () => {
  assert.equal(api.demangle("_D3foozi").ast.nodes.find(node => node.kind === "Type").code, "zi");
  assert.equal(api.demangle("_D3foozk").ast.nodes.find(node => node.kind === "Type").code, "zk");
  const result = api.demangle("_D2πZ");
  assert.deepEqual(result.ast.nodes.find(node => node.kind === "IdentifierValue"),
    { kind: "IdentifierValue", start: 3, end: 5, children: [], value: "π" });
  assert.equal(result.ast.nodes[0].end, 6);
});

test("retains upstream rejection of a symbol without any output-producing identifier", () => {
  assert.equal(api.demangle("_D0Z").status, "invalid");
  assert.equal(api.demangleWithText("_D0Z").status, "invalid");
});

test("returns trees detached from later calls and from WASM memory", () => {
  const first = api.demangle("_D8demangle4testZ");
  const expected = structuredClone(first.ast);
  first.ast.nodes[0].kind = "local change";
  first.ast.nodes[0].children.push(9999);
  assert.deepEqual(api.demangle("_D8demangle4testZ").ast, expected);
  assert.deepEqual(api.demangleWithText("_D8demangle4testZ").ast, expected);
});

test("captures D identifier backreferences and original byte offsets", () => {
  // DLangDemangleTest.cpp: Qe refers four bytes backwards to 3ABC.
  const result = api.demangle("_D8demangle3ABCQe1ai");
  assert.equal(result.ast.nodes.find(node => node.kind === "Backref").targetOffset, "11");
  assert.equal(result.ast.nodes.find(node => node.kind === "BackrefDistance").value, "4");
  const reference = result.ast.nodes.find(node => node.kind === "IdentifierBackref");
  assert.equal(reference.start, 15);
  assert.equal(reference.end, 17);
  assert.deepEqual(reference.children.map(index => result.ast.nodes[index].kind),
    ["Backref", "DecimalNumber", "IdentifierValue"]);
});
