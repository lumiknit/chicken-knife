import { Node } from './struct';

export class SortableTreeState<T> {
	root: Node<T>;

	constructor(root: Node<T>) {
		this.root = root;
	}

	addItem(parent: Node<T>, item: Node<T>) {
}
