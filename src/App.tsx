import { Component, createSignal, Setter } from "solid-js";
import { DEFAULT_OPTIONS, SortableTreeState } from "./sortable-tree/state";
import { SortableTree } from "./sortable-tree";

const SortableItem = (props: {
	s: SortableTreeState<string>;
	id: string;
	data: string;
	setData: Setter<string>;
}) => {
	const [cnt, setCnt] = createSignal(0);
	return (
		<div>
			<input type="text" value={props.data}
				onChange={(e) => props.setData(e.currentTarget.value)}
			/>
			<button onClick={() => {
				setCnt(x => x + 1);
				props.setData(x => x + "a");
			}}>{cnt()}</button>
			<button onClick={() => props.s.deleteNodeByID(props.id)}>Delete</button>
		</div>
	);
};

const App: Component = () => {
	const state = new SortableTreeState<string>(SortableItem, DEFAULT_OPTIONS);

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
