const { merge } = require("webpack-merge");
const common = require("./webpack.common.js");
const HtmlWebpackPlugin = require("html-webpack-plugin");

module.exports = merge(common, {
  entry: "./demo/index.tsx",
  mode: "development",
  devServer: {
    static: "./demo",
  },
  devtool: "inline-source-map",
  plugins: [
    new HtmlWebpackPlugin({
      title: "mstform Demo",
      inject: "body",
      template: "demo/div.html",
    }),
  ],
});
