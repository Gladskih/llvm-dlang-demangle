bool parseSymbol(Graph &graph, std::string_view input, Presentation mode, std::string &text) {
  if (input.size() < 2 || input.substr(0, 2) != "_D") return false;
  const size_t root = graph.begin("Symbol", 0);
  OutputBuffer output(mode);
  bool valid;
  if (input == "_Dmain") {
    const size_t main = graph.begin("Main", 2);
    graph.finish(main, input.size());
    if (mode == Presentation::Include) output << "D main";
    valid = true;
  } else {
    Demangler parser(graph, mode, input);
    const char *end = parser.parseMangle(&output);
    valid = end == input.data() + input.size() && output.getCurrentPosition() > 0;
  }
  graph.finish(root, input.size());
  if (valid && mode == Presentation::Include)
    text.assign(output.getBuffer(), output.getCurrentPosition());
  return valid;
}
