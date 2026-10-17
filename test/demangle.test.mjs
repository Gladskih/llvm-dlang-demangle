import assert from "node:assert/strict";
import { test } from "node:test";
import { createDemangler } from "../dist/node.js";

const api = await createDemangler();
// llvm/unittests/Demangle/DLangDemangleTest.cpp at the pinned revision.
test("demangles the upstream example exactly", () => {
  assert.deepEqual(api.demangle("_D8demangle4testZ"),
    { status: "success", text: "demangle.test", warnings: [] });
});

for (const input of ["?", "_R", "_D", "_D88", "_RRR", "_ZN3foo3barE", "_R18446744073709551617"]) {
  test("rejects malformed or unsupported name " + input, () => {
    const result = api.demangle(input);
    assert.equal(result.status, "invalid");
    assert.equal(result.text, null);
    assert(result.warnings.length > 0);
    assert.equal(api.demangle("_D8demangle4testZ").text, "demangle.test");
  });
}

test("accepts UTF-8 identifiers and names over 1 MiB without wrapper caps", () => {
  const identifier = "π";
  assert.equal(api.demangle(`_D2${identifier}Z`).text, identifier);
  const long = "L".repeat(1048577);
  assert.equal(api.demangle(`_D${long.length}${long}Z`).text, long);
});

test("every truncated prefix returns a diagnostic or a valid upstream name", () => {
  const input = "_D8demangle4testZ";
  for (let length = 0; length < input.length; ++length) {
    const result = api.demangle(input.slice(0, length));
    assert.equal(result.status, "invalid");
    assert.equal(result.text, null);
  }
});

// DLangDemangle.cpp parseType explicitly leaves function types as TODO.
test("reports upstream unsupported function signatures", () => {
  assert.equal(api.demangle("_D3foo3barFiZi").status, "invalid");
});
