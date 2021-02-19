import * as React from "react";
import * as ReactDOM from "react-dom";
import { MyForm } from "./component";
import { observer} from "mobx-react"

const ObserverMyForm = observer(() => <MyForm /> as any)

// XXX why the 'as any' hack?
ReactDOM.render(<ObserverMyForm />, document.getElementById("demo"));
