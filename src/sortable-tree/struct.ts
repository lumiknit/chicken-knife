export type Node<T> = {
	id: string;
	data: T;
	children: Node<T>[];
};
