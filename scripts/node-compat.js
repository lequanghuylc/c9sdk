"use strict";

/**
 * Polyfills for Node.js internals removed in newer Node.js versions (>= 24)
 * that are still used by old dependencies (connect 2.x, send 0.1.x, fresh).
 */
var OutgoingMessage = require("http").OutgoingMessage;

// res._headers was deprecated (DEP0066) and removed in Node.js 24.
// The old libraries only read it, so a read only view of the headers is enough.
if (!Object.getOwnPropertyDescriptor(OutgoingMessage.prototype, "_headers")) {
    Object.defineProperty(OutgoingMessage.prototype, "_headers", {
        configurable: true,
        get: function() {
            return this.getHeaders();
        },
        set: function() {}
    });
}
