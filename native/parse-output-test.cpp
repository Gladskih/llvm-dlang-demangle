#include "parse-output.h"
#include <cassert>
#include <string_view>

static void testAnalysis() {
  ParseOutputBuffer buffer(Presentation::Omit);
  buffer << "name";
  buffer.insert(0, nullptr, 4);
  buffer.setCurrentPosition(7);
  assert(buffer.getCurrentPosition() == 7);
  assert(buffer.getBuffer() == nullptr);
  try { buffer.insert(8, nullptr, 1); assert(false); }
  catch (const std::out_of_range &) {}
  try { buffer.setCurrentPosition(8); assert(false); }
  catch (const std::out_of_range &) {}
}

static void testPresentation() {
  ParseOutputBuffer buffer(Presentation::Include);
  buffer << "foo";
  buffer << '.';
  buffer << "bar";
  buffer.prepend("int ");
  buffer.setCurrentPosition(buffer.getCurrentPosition() - 1);
  assert(std::string_view(buffer.getBuffer(), buffer.getCurrentPosition()) == "int foo.ba");
}

int main() { testAnalysis(); testPresentation(); }
