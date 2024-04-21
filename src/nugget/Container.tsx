import { Component, For, createComponent } from "solid-js";

import { SortableState, setSortableOnMount } from "./sortable-state";
import Item from "./Item";
import { uId } from "../common";

type Props = {
	s: SortableState;
};

const Container: Component<Props> = props => {
	let ref: HTMLDivElement;
	let list = [];
	for (let i = 0; i < 10; i++) {
		list.push(i);
	}

	setSortableOnMount(props.s, () => ref);

	const addItem = () => {
		const i = createComponent(Item, { s: props.s, label: uId() });
		// append to the root container
		console.log(i());
		ref.appendChild(i());
	};

	return (
		<>
			<button onClick={addItem}>Add Item</button>
			<div ref={ref!} class="ng-container">
				<For each={list}>
					{item => <Item s={props.s} label={"" + item} />}
				</For>
			</div>
		</>
	);
};

export default Container;
