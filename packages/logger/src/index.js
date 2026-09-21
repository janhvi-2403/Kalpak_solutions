"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p)) __createBinding(exports, m, p);
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.logContextStorage = exports.getLogContext = exports.runWithLogContext = exports.logger = void 0;
exports.createLogger = createLogger;
const pino_1 = __importDefault(require("pino"));
const redaction_1 = require("./redaction");
const context_1 = require("./context");
Object.defineProperty(exports, "getLogContext", { enumerable: true, get: function () { return context_1.getLogContext; } });
Object.defineProperty(exports, "runWithLogContext", { enumerable: true, get: function () { return context_1.runWithLogContext; } });
Object.defineProperty(exports, "logContextStorage", { enumerable: true, get: function () { return context_1.logContextStorage; } });
function createLogger(options) {
    const isPretty = process.env.LOG_PRETTY === 'true' || process.env.NODE_ENV === 'development';
    const level = process.env.LOG_LEVEL || 'info';
    const defaultOptions = {
        level,
        redact: {
            paths: redaction_1.REDACTION_PATHS,
            censor: redaction_1.REDACTION_CENSOR,
        },
        timestamp: pino_1.default.stdTimeFunctions.isoTime,
        mixin() {
            const ctx = (0, context_1.getLogContext)();
            if (!ctx)
                return {};
            return {
                correlationId: ctx.correlationId,
                tenantId: ctx.tenantId,
                userId: ctx.userId,
            };
        },
        transport: isPretty
            ? {
                target: 'pino-pretty',
                options: {
                    colorize: true,
                    singleLine: true,
                    translateTime: 'SYS:yyyy-mm-dd HH:MM:ss',
                    ignore: 'pid,hostname',
                },
            }
            : undefined,
        ...options,
    };
    return (0, pino_1.default)(defaultOptions);
}
exports.logger = createLogger();
__exportStar(require("./redaction"), exports);
//# sourceMappingURL=index.js.map