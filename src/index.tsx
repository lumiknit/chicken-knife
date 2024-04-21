/* @refresh reload */
import { render } from "solid-js/web";

// Sortable Settings
import Sortable, { MultiDrag } from "sortablejs";
Sortable.mount(new MultiDrag());

import "./index.scss";
import App from "./App";

const root = document.getElementById("root");

render(() => <App />, root!);
