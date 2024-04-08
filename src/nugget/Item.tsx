import { Component, createSignal } from "solid-js";
import { SortableState } from ".";

type Props = {
	s: SortableState;
	label: string;
};

const Item: Component<Props> = props => {
	const [t, setT] = createSignal(false);

	return <div class="ng-item">
		<div class="ng-item-main">
			<span class="ng-item-icon">a</span>
			{props.label}
			{t() ? 'a' : 'b'}
			<button onClick={() => setT(x => !x)}>toggle</button>
		</div>
		<div class="ng-item-children">
			children
		</div>
	</div>;
};

export default Item;
