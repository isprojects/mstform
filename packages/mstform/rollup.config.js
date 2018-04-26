import filesize from "rollup-plugin-filesize";
import resolve from "rollup-plugin-node-resolve";
import uglify from "rollup-plugin-uglify";
import replace from "rollup-plugin-replace";

function getEnvVariables(production) {
  return {
    "process.env.NODE_ENV": production ? "'production'" : "'development'"
  };
}

export default [
  {
    entry: "./lib/index.js",
    dest: "./dist/mstform.js",
    format: "cjs",
    external: ["mobx", "mobx-state-tree"],
    globals: {
      mobx: "mobx",
      "mobx-state-tree": "mobx-state-tree"
    },
    plugins: [resolve(), filesize()]
  },
  {
    entry: "./lib/index.js",
    dest: "./dist/mstform.umd.js",
    format: "umd",
    moduleName: "mstForm",
    external: ["mobx", "mobx-state-tree"],
    globals: {
      mobx: "mobx",
      "mobx-state-tree": "mobx-state-tree"
    },
    plugins: [resolve(), replace(getEnvVariables(true)), uglify(), filesize()]
  },
  {
    entry: "./lib/index.js",
    dest: "./dist/mstform.module.js",
    format: "es",
    external: ["mobx", "mobx-state-tree"],
    globals: {
      mobx: "mobx",
      "mobx-state-tree": "mobx-state-tree"
    },
    plugins: [resolve(), filesize()]
  }
];
