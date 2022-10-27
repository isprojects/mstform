import * as React from "react";
import { createRoot } from "react-dom/client";
import { MyForm } from "./component";
import { observer } from "mobx-react";

const ObserverMyForm = observer(() => (<MyForm />) as any);

const container = document.getElementById("demo");
const root = createRoot(container!);
root.render(<ObserverMyForm />);
