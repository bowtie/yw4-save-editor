/**
 * Minimal ambient types for the node builtins used by the save-fixture tests.
 * Vitest executes them in node (where `node:fs` exists at runtime), but the
 * project deliberately ships no @types/node.
 */
declare module "node:fs" {
  export function existsSync(path: string): boolean;
  export function readFileSync(path: string): Uint8Array;
}
