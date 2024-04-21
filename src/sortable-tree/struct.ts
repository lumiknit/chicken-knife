// External node data structure
export type Node<T> = {
	data: T;
	children?: Node<T>[];
};
