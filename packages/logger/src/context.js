"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.logContextStorage = void 0;
exports.runWithLogContext = runWithLogContext;
exports.getLogContext = getLogContext;
const async_hooks_1 = require("async_hooks");
exports.logContextStorage = new async_hooks_1.AsyncLocalStorage();
function runWithLogContext(context, fn) {
    return exports.logContextStorage.run(context, fn);
}
function getLogContext() {
    return exports.logContextStorage.getStore();
}
//# sourceMappingURL=context.js.map