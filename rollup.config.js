import typescript from "@rollup/plugin-typescript";
import { nodeResolve } from "@rollup/plugin-node-resolve";
import commonjs from "@rollup/plugin-commonjs";
import css from "rollup-plugin-css-only";

import svelte from "rollup-plugin-svelte";
import process from "svelte-preprocess";

const banner = `/*
THIS IS A GENERATED/BUNDLED FILE BY ROLLUP
if you want to view the source visit the plugins github repository
*/
`;

export default {
  input: "./src/main.ts",
  output: {
    dir: ".",
    sourcemap: "inline",
    sourcemapExcludeSources: true,
    format: "cjs",
    exports: "default",
    banner,
  },
  external: ["obsidian"],
  plugins: [
    /* vue(), */
    typescript(),
    svelte({ emitCss: false, preprocess: process() }),
    nodeResolve({ browser: true, dedupe: ["svelte"] }),
    commonjs(),
    css({ output: "styles.css" }),
  ],
};
