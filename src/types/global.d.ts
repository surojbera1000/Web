// GramJS uses Node's Buffer, which is provided at runtime by
// vite-plugin-node-polyfills. Declare it globally for type-checking
// (types come from the `buffer` package) without pulling in all of @types/node.
declare const Buffer: typeof import('buffer').Buffer;

// Side-effect CSS import (also covered by vite/client at build time).
declare module '*.css';
