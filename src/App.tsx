import { Component, createSignal } from "solid-js";
import { Container, newSortableState } from "./nugget";
import { SortableTreeState } from "./sortable-tree/state";
import { Node } from "./sortable-tree/struct";
import { SortableTree } from "./sortable-tree";

const SortableItem = (props: {
	s: SortableTreeState<string>;
	id: string;
	data: string;
}) => {
	const [cnt, setCnt] = createSignal(0);
	return (
		<div>
			<input type="text" value={props.data} />
			<button onClick={() => setCnt(x => x + 1)}>{cnt()}</button>
		</div>
	);
};

const App: Component = () => {
	const state = new SortableTreeState<string>(SortableItem, {
		animation: 150,
		fallbackOnBody: true,
		swapThreshold: 0.65,
	});

	return (
		<>
			Body
			<SortableTree s={state} />
			<button
				onClick={() =>
					state.insertNode(
						{
							data: "Hello",
							children: [],
						},
						state.root.id,
					)
				}>
				Add
			</button>
		</>
	);
};

export default App;
