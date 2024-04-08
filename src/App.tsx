import { Component } from "solid-js";
import { Container, newSortableState } from "./nugget";

const App: Component = () => {
  const state = newSortableState();

	return <>
    Body
    <Container s={state} />
  </>;
};

export default App;
