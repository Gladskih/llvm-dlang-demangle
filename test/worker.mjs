import { createDemangler } from "../dist/browser.js";
postMessage((await createDemangler()).demangleWithText("_D8demangle4testZ"));
