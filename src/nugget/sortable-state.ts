import Sortable from "sortablejs";

import { uId } from "../common";
import { onCleanup, onMount } from "solid-js";

// SortableState is a shared state for a single group of stable objects.

export type SortableState = {
	group: string;
	options: Sortable.Options;

	items: any[];
};

export const newSortableState = (): SortableState => {
	const group = uId();
	const options: Sortable.Options = {
		// Global
		group,
		animation: 200,

		// Classes
		ghostClass: "s-ghost",
		chosenClass: "s-chosen",
		dragClass: "s-drag",
		filter: ".s-ignore",

		fallbackOnBody: true,
		fallbackTolerance: 3,
		swapThreshold: 0.65,

		// Multi Drag
		multiDrag: true,
		selectedClass: "s-selected",

		// Scroll
		scroll: true,
		scrollSensitivity: 48,
		scrollSpeed: 10,

		// Events
		onEnd: e => {
			console.log(e);
		},
	};

	return {
		group,
		options,
		items: [],
	};
};

export const setSortableOnMount = (s: SortableState, g: () => HTMLElement) => {
	let sortable: Sortable | null = null;
	onMount(() => {
		sortable = new Sortable(g(), s.options);
	});
	onCleanup(() => {
		if (!sortable) return;
		sortable.destroy();
	});
};
