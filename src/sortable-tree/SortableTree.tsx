import { Component } from "solid-js";
import { SortableTreeState } from "./state";

type Props = {
	s: SortableTreeState<any>;
};

const SortableTree: Component<Props> = props => {
	return <div class="stree-root">{props.s.getRootElem()}</div>;
};

export default SortableTree;
