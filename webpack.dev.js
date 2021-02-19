const merge = require("webpack-merge");
const common = require("./webpack.common.js");
const HtmlWebpackPlugin = require("html-webpack-plugin");

const path = require("path");

module.exports = merge(common, {
  entry: "./demo/index.tsx",
  mode: "development",
  devServer: {
    contentBase: "./demo",
    disableHostCheck: true,
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
