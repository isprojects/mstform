const rewireMobX = require("react-app-rewire-mobx");
const { injectBabelPlugin } = require("react-app-rewired");

/* config-overrides.js */
module.exports = function override(config, env) {
  //do stuff with the webpack config...
  // config = injectBabelPlugin(
  //   ["import", { libraryName: "antd", style: true }],
  //   config
  // );
  config = rewireMobX(config, env);
  return config;
};
