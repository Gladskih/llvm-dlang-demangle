import { generateSchema } from "./generate-schema.mjs";
import { instrumentDlang } from "./instrument-dlang.mjs";
import assert from "node:assert/strict";
import { cp, mkdir, readFile, writeFile } from "node:fs/promises";

function replaceOnce(source, before, after) {
  assert.equal(source.split(before).length, 2, "Unrecognized upstream code: " + before);
  return source.replace(before, after);
}

// llvm/include/llvm/Demangle/Utility.h: grow against actual address-space bounds.
export function prepareUtility(source) {
  source = replaceOnce(source, "size_t Need = N + CurrentPosition;",
    "size_t Need = checkedAdd(N, CurrentPosition);");
  source = replaceOnce(source, "Need += 1024 - 32;", "Need = checkedAdd(Need, 1024 - 32);");
  source = replaceOnce(source, "BufferCapacity *= 2;",
    "if (BufferCapacity <= std::numeric_limits<size_t>::max() / 2) BufferCapacity *= 2;");
  source = replaceOnce(source,
    "Buffer = static_cast<char *>(std::realloc(Buffer, BufferCapacity));\n" +
    "      if (Buffer == nullptr)\n        std::abort();",
    "char *Replacement = static_cast<char *>(std::realloc(Buffer, BufferCapacity));\n" +
    "      if (Replacement == nullptr) throw std::bad_alloc{};\n      Buffer = Replacement;");
  return "#include \"safety.h\"\n" + source;
}

export function prepareOwnership(source) {
  source = replaceOnce(source, "using llvm::itanium_demangle::OutputBuffer;",
    "#include \"output-buffer.h\"\nusing OutputBuffer = ManagedOutputBuffer;");
  assert.equal(source.split("std::free(Demangled.getBuffer());").length, 3);
  source = source.replaceAll("std::free(Demangled.getBuffer());", "");
  source = replaceOnce(source, "std::free(TypeBuf.getBuffer());", "");
  source = replaceOnce(source, "return Demangled.getBuffer();", "return Demangled.release();");
  // C++ <cctype> requires unsigned char values. Classify D ABI ASCII explicitly.
  assert.equal((source.match(/std::isdigit/g) ?? []).length, 5);
  assert.equal((source.match(/std::isalpha/g) ?? []).length, 1);
  source = source.replaceAll("std::isdigit", "isDigit").replaceAll("std::isalpha", "isAlpha");
  return "static bool isDigit(unsigned char value) { return value >= '0' && value <= '9'; }\n" +
    "static bool isAlpha(unsigned char value) { return (value >= 'a' && value <= 'z') || " +
    "(value >= 'A' && value <= 'Z'); }\n" + source;
}

await mkdir(".build/guarded/llvm/Demangle", { recursive: true });
await cp(".build/llvm/llvm/include/llvm/Demangle", ".build/guarded/llvm/Demangle", { recursive: true });
await writeFile(".build/guarded/llvm/Demangle/Utility.h", prepareUtility(await readFile(
  ".build/llvm/llvm/include/llvm/Demangle/Utility.h", "utf8")));
await generateSchema();
await writeFile(".build/parser.cpp", instrumentDlang(prepareOwnership(await readFile(
  ".build/llvm/llvm/lib/Demangle/DLangDemangle.cpp", "utf8"))));
