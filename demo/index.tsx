import * as React from "react";
import * as ReactDOM from "react-dom";
import { MyForm } from "./component";

// XXX "as any" to make a mysterious type error go away
ReactDOM.render(<MyForm /> as any, document.getElementById("demo"));
