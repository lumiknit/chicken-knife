import { Accessor, Component, createSignal, Setter } from "solid-js";
import { Node } from "./struct";
import { render } from "solid-js/web";
import Sortable, { SortableOptions } from "sortablejs";
import { uID } from "../common";

export type NodeID = string;

// Internal node data structure
type ChildrenData<T> = {
	sortable: Sortable;
	container: HTMLElement;
	w: NodeW<T>[];
};

export type NodeW<T> = {
	data: Accessor<T>;
	setData: Setter<T>;

	id: NodeID;
	parent?: NodeW<T>;

	elem: HTMLElement;
	dispose: () => void;

	children?: ChildrenData<T>;
};

type Props<T> = {
	s: SortableTreeState<T>;
	id: NodeID;
	data: T;
};

export class SortableTreeState<T> {
	id: string; // Unique ID for the tree
	dataAttrSortableID: string; // Data attribute for sortable ID
	dataAttrID: string; // Data attribute for node ID

	options: SortableOptions;

	itemComponent: Component<Props<T>>;
	nodes: Map<NodeID, NodeW<T>>;

	// Root element is just a container for all the nodes
	root: NodeW<T>;

	constructor(itemComponent: Component<Props<T>>, options?: SortableOptions) {
		this.id = uID();
		this.dataAttrSortableID = "data-sortable-id";
		this.dataAttrID = "data-id";

		this.options = options || {};

		// Overwrite some options
		this.options.group = this.id;

		this.itemComponent = itemComponent;

		this.nodes = new Map();

		const node: Node<T> = {
			children: [],
		} as any;

		this.root = this.assignNode(node);
	}

	dispose() {
		// Clean-up all the nodes (also remove dom and dispose)
		for (const node of this.nodes.values()) {
			node.dispose();
			if (node.children) {
				node.children.sortable.destroy();
			}
			node.elem.remove();
		}
		this.nodes.clear();
	}

	private assignNode(node: Node<T>): NodeW<T> {
		const [data, setData] = createSignal(node.data);

		const id = this.newID();

		const elem = document.createElement("div");
		elem.classList.add("stree-item");
		elem.setAttribute(this.dataAttrSortableID, this.id);
		elem.setAttribute(this.dataAttrID, id);

		const componentTarget = document.createElement("div");

		elem.appendChild(componentTarget);

		const Component = this.itemComponent;
		const dispose = render(
			() => <Component s={this} data={data()} id={id} />,
			componentTarget,
		);

		// Create node wrapper and assign it to the node
		const w: NodeW<T> = {
			data,
			setData,
			id,
			elem,
			dispose,
		};
		this.nodes.set(w.id, w);

		// If node can have children, create a sortable list
		if (node.children !== undefined) {
			const container = document.createElement("div");
			container.classList.add("stree-children");
			elem.appendChild(container);

			w.children = {
				container,
				sortable: new Sortable(container, this.options),
				w: [],
			};

			for (const child of node.children) {
				const childW = this.assignNode(child);
				this.linkNodeToParent(childW, w);
			}
		}

		return w;
	}

	private linkNodeToParent(node: NodeW<T>, parent: NodeW<T>, index?: number) {
		if (node.parent) throw new Error(`Node already has a parent`);
		if (!parent.children)
			throw new Error(`The parent cannot have children`);
		node.parent = parent;
		if (index === undefined) {
			parent.children.w.push(node);
			parent.children.container.appendChild(node.elem);
		} else {
			parent.children.w.splice(index, 0, node);
			parent.children.container.insertBefore(
				node.elem,
				parent.elem.children[index],
			);
		}
	}

	private unlinkNodeFromParent(node: NodeW<T>) {
		if (!node.parent) throw new Error(`Node does not have a parent`);
		if (!node.parent.children)
			throw new Error(`The parent cannot have children`);

		const index = node.parent.children.w.indexOf(node);
		if (index === -1) throw new Error(`Node not found in parent children`);

		node.parent.children.w.splice(index, 1);
		node.parent.children.container.removeChild(node.elem);
		node.parent = undefined;
	}

	private newID(): NodeID {
		return uID();
	}

	private popNodeDatas(ids: Set<NodeID>): NodeW<T>[] {
		// Remove node data from the tree (Without disposing)
		const popped: NodeW<T>[] = [];
		for (const id of ids) {
			// Get node
			const node = this.nodes.get(id);
			if (!node) throw new Error(`Node not found: ${id}`);

			// Remove node from parent
			if (node.parent) {
				this.unlinkNodeFromParent(node);
			}

			// Remove node from the tree
			this.nodes.delete(id);
		}
		return popped;
	}

	getRootElem() {
		return this.root.children!.container;
	}

	getNodeByID(id: NodeID): NodeW<T> {
		const node = this.nodes.get(id);
		if (!node) throw new Error(`Node not found: ${id}`);
		return node;
	}

	insertNode(node: Node<T>, parentID: NodeID, index?: number): NodeID {
		const parent = this.getNodeByID(parentID);
		const nodeW = this.assignNode(node);
		this.linkNodeToParent(nodeW, parent, index);
		return nodeW.id;
	}

	deleteNode(id: NodeID) {
		const node = this.getNodeByID(id);
		if (node.children) {
			node.children.sortable.destroy();
		}
		node.dispose();
		this.nodes.delete(id);
	}
}
