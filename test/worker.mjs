import { createDemangler } from "../dist/browser.js";
postMessage((await createDemangler()).demangle("_D8demangle4testZ"));
