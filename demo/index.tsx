import * as React from "react";
import * as ReactDOM from "react-dom";
import { MyForm } from "./component";

// XXX why the 'as any' hack?
ReactDOM.render(<MyForm /> as any, document.getElementById("demo"));
