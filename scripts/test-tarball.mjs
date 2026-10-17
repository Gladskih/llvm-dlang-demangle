import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtemp, readFile, realpath, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { npmCommand } from "./npm-command.mjs";

const pack = JSON.parse(await readFile("pack-result.json"))[0];
const tarball = resolve(pack.filename);
const temporary = await mkdtemp(join(tmpdir(), "llvm-dlang-demangle-"));
async function removeTemporary() {
  if (dirname(await realpath(temporary)) !== await realpath(tmpdir())) {
    throw new Error("Refusing to delete a directory outside the temporary root");
  }
  await rm(temporary, { recursive: true, force: true });
}
try {
  const [command, ...prefix] = npmCommand();
  execFileSync(command, [...prefix, "install", "--offline", "--ignore-scripts", "--no-audit",
    "--no-fund", tarball], { cwd: temporary, stdio: "pipe" });
  await writeFile(join(temporary, "smoke.mjs"), `
    import assert from "node:assert/strict";
    import { createDemangler } from "llvm-dlang-demangle";
    import { readFile } from "node:fs/promises";
    const asset = import.meta.resolve("llvm-dlang-demangle/llvm-dlang-demangle.wasm");
    const api = await createDemangler();
    assert.deepEqual(api.demangle("_D8demangle4testZ"),
      { status: "success", text: "demangle.test", warnings: [] });
    assert.equal(api.demangle("?").status, "invalid");
    assert.equal((await createDemangler({ wasmBinary: await readFile(new URL(asset)) }))
      .demangle("_D8demangle4testZ").text, "demangle.test");
  `);
  execFileSync(process.execPath, ["smoke.mjs"], { cwd: temporary, stdio: "pipe" });
  assert(pack.files.some(file => file.path === "dist/index.d.ts"));
  assert(pack.files.some(file => file.path === "licenses/LLVM.txt"));
} finally {
  await removeTemporary();
}
console.warn(`Installed and tested the exact tarball: ${pack.filename}`);
