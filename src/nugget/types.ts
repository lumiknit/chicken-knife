export type Node<T> = {
	id: string;
	data: T;
	childrens: Node<T>[];
};

export type Tree<T> = {
	root: Node<T>;
};
