#pragma once
#include "graph.h"
#include "output-buffer.h"
#include <stdexcept>

// D's parser needs buffer positions for insertion, even when presentation is omitted.
class ParseOutputBuffer {
  Presentation mode;
  ManagedOutputBuffer output;
  size_t length = 0;
public:
  explicit ParseOutputBuffer(Presentation mode) : mode(mode) {}
  ParseOutputBuffer &operator<<(std::string_view value) {
    length = checkedAdd(length, value.size());
    if (mode == Presentation::Include) output += value;
    return *this;
  }
  ParseOutputBuffer &operator<<(char value) { return *this << std::string_view(&value, 1); }
  void insert(size_t position, const char *data, size_t count) {
    if (position > length) throw std::out_of_range("Output insertion");
    length = checkedAdd(length, count);
    if (mode == Presentation::Include) output.insert(position, data, count);
  }
  void prepend(std::string_view value) { insert(0, value.data(), value.size()); }
  size_t getCurrentPosition() const { return length; }
  void setCurrentPosition(size_t position) {
    if (position > length) throw std::out_of_range("Output position");
    length = position;
    if (mode == Presentation::Include) output.setCurrentPosition(position);
  }
  char *getBuffer() { return output.getBuffer(); }
};
