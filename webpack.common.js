const path = require("path");
const CleanWebpackPlugin = require("clean-webpack-plugin");

module.exports = {
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        use: "ts-loader",
        exclude: /node_modules/,
      },
    ],
  },
  resolve: {
    extensions: [".tsx", ".ts", ".js"],
  },
  output: {
    filename: "mstform.js",
    library: "mstform",
    libraryTarget: "umd",
  },
  plugins: [new CleanWebpackPlugin(["dist"])],
};
