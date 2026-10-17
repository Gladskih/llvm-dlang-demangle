import { transformFunction, replaceOnce, removeFunction, assertRuleTags } from "./cpp-function.mjs";

const rules = [
  ["void Demangler::parseMangle(OutputBuffer *Demangled,\n                            std::string_view &Mangled)", "MangledName"],
  ["void Demangler::parseQualified(OutputBuffer *Demangled,\n                               std::string_view &Mangled)", "QualifiedName"],
  ["void Demangler::parseIdentifier(OutputBuffer *Demangled,\n                                std::string_view &Mangled)", "Identifier"],
  ["bool Demangler::parseType(OutputBuffer *Demangled, std::string_view &Mangled)", "Type"],
  ["void Demangler::parseLName(OutputBuffer *Demangled, std::string_view &Mangled,\n                           unsigned long Len)", "IdentifierValue"],
  ["void Demangler::decodeNumber(std::string_view &Mangled, unsigned long &Ret)", "DecimalNumber"],
  ["bool Demangler::decodeBackrefPos(std::string_view &Mangled, long &Ret)", "BackrefDistance"],
  ["bool Demangler::decodeBackref(std::string_view &Mangled,\n                              std::string_view &Ret)", "Backref"],
  ["void Demangler::parseSymbolBackref(OutputBuffer *Demangled,\n                                   std::string_view &Mangled)", "IdentifierBackref"],
  ["void Demangler::parseTypeBackref(OutputBuffer *Demangled,\n                                 std::string_view &Mangled)", "TypeBackref"],
];

function captureValues(source) {
  source = replaceOnce(source, "Ret = Val;\n}",
    "Ret = Val;\n  Trace.field(\"value\", std::to_string(Val));\n}");
  source = replaceOnce(source, "Ret = Val;\n      Mangled.remove_prefix(1);",
    "Ret = Val;\n      Trace.field(\"value\", std::to_string(Val));\n      Mangled.remove_prefix(1);");
  source = replaceOnce(source, "Ret = Qpos - RefPos;",
    "Ret = Qpos - RefPos;\n  Trace.field(\"targetOffset\", std::to_string(Trace.position(Ret)));");
  source = replaceOnce(source, "switch (Mangled.front()) {",
    "Trace.field(\"code\", std::string(Mangled.substr(0, std::string_view(\"zN\").find(Mangled.front()) != std::string_view::npos ? 2 : 1)));\n  switch (Mangled.front()) {");
  return source;
}

function captureNames(source) {
  source = replaceOnce(source, "switch (Len) {",
    "Trace.field(\"value\", std::string(Mangled.substr(0, Len)));\n  switch (Len) {");
  for (const [suffix, special] of [["__initZ", "Initializer"], ["__vtblZ", "VTable"],
    ["__ClassZ", "ClassInfo"], ["__InterfaceZ", "Interface"], ["__ModuleInfoZ", "ModuleInfo"]]) {
    source = replaceOnce(source, "if (starts_with(Mangled, \"" + suffix + "\")) {",
      "if (starts_with(Mangled, \"" + suffix + "\")) {\n      Trace.field(\"special\", \"" + special + "\");");
  }
  return source;
}

export function instrumentDlang(source) {
  assertRuleTags(source, "bool Demangler::parseType(OutputBuffer *Demangled, std::string_view &Mangled)",
    ["i", "v", "a", "b", "c", "d", "e", "f", "g", "h", "j", "k", "l", "m", "n", "o", "p", "q", "r", "s", "t", "u", "w", "z", "N", "Q"]);
  source = removeFunction(source, "char *llvm::dlangDemangle(std::string_view MangledName)");
  source = replaceOnce(source, "struct Demangler {", "struct Demangler {\n  Graph &Trace;");
  source = replaceOnce(source, "Demangler(std::string_view Mangled);",
    "Demangler(Graph &Trace, std::string_view Mangled);");
  source = replaceOnce(source, "Demangler::Demangler(std::string_view Mangled)\n    : Str(Mangled)",
    "Demangler::Demangler(Graph &Trace, std::string_view Mangled)\n    : Trace(Trace), Str(Mangled)");
  source = replaceOnce(source, "using OutputBuffer = ManagedOutputBuffer;",
    "using OutputBuffer = ParseOutputBuffer;");
  source = replaceOnce(source, "OutputBuffer TypeBuf;", "OutputBuffer TypeBuf(Mode);");
  source = replaceOnce(source, "Graph &Trace;", "Graph &Trace;\n  Presentation Mode;");
  source = replaceOnce(source, "Demangler(Graph &Trace, std::string_view Mangled);",
    "Demangler(Graph &Trace, Presentation Mode, std::string_view Mangled);");
  source = replaceOnce(source, "Demangler::Demangler(Graph &Trace, std::string_view Mangled)\n    : Trace(Trace)",
    "Demangler::Demangler(Graph &Trace, Presentation Mode, std::string_view Mangled)\n    : Trace(Trace), Mode(Mode)");
  for (const [signature, kind] of rules) source = transformFunction(source, signature,
    body => "\n  DScope Capture(Trace, \"" + kind + "\", Mangled);" + body);
  return "#include \"parse-output.h\"\n" + captureNames(captureValues(source)) +
    "\n#include \"parse-symbol.inc\"\n";
}
