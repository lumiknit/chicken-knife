import { Accessor, Component, createSignal, Setter } from "solid-js";
import { Node } from "./struct";
import { render } from "solid-js/web";
import Sortable from "sortablejs";
import { uID } from "../common";

export type NodeID = string;

/**
 * NodeW's children data.
 * @typeParam T Type of the node data
 */
type ChildrenData<T> = {
	/** Sortable object */
	sortable: Sortable;
	/** DOM element where children will be contained */
	container: HTMLElement;
	/** Children node data */
	w: NodeW<T>[];
};

/**
 * Node Data Wrapper used internally.
 * It contains extra information about DOM and tree connection.
 * @typeParam T Type of the node data
 */
export type NodeW<T> = {
	/** Getter of node's data (SolidJS Signal) */
	data: Accessor<T>;
	/** Setter of node's data (SolidJS Signal) */
	setData: Setter<T>;

	/** ID of the node. It may be unique in the tree. */
	id: NodeID;
	/** Parent node. Undefined if it's a root node. */
	parent?: NodeW<T>;

	/** DOM element of the node */
	elem: HTMLElement;
	/** Dispose SolidJS component */
	dispose: () => void;

	/** Children data. Undefined if it cannot have children */
	children?: ChildrenData<T>;
};

/**
 * Callback to convert NodeW to Node.
 * Use with SortableTreeState#forEach or SortableTreeState#forEachDOM.
 * @param root Root NodeW
 * @returns [callback, getter]
 */
function nodeWToNodeCallback<T>(
	root: NodeW<T>,
): [
	(node: NodeW<T>, index: number, parent: NodeW<T>) => void,
	() => Node<T>[],
] {
	const rootChildren: Node<T>[] = [];
	const rootNode: Node<T> = {
		children: rootChildren,
	} as any;
	const map = new Map<NodeID, Node<T>>([
		[root.id, rootNode],
	]);
	const callback = (node: NodeW<T>, index: number, parent: NodeW<T>) => {
		const p = map.get(parent.id)!;
		console.log(parent.id, p, node);
		const n: Node<T> = {
			data: node.data(),
		};
		if (node.children !== undefined) n.children = [];
		p.children![index] = n;
	};
	return [callback, () => rootChildren];
};

export const DEFAULT_OPTIONS: Sortable.Options = {
	delay: 200,
	delayOnTouchOnly: true,
	touchStartThreshold: 8,

	animation: 150,
	fallbackOnBody: true,
	swapThreshold: 0.65,

	multiDrag: true,
	selectedClass: "selected",
	avoidImplicitDeselect: false,
};

/**
 * Properties for the Sortable Tree item component.
 *
 * @typeParam T Type of the node data
 */
type Props<T> = {
	s: SortableTreeState<T>;
	id: NodeID;
	data: T;
	setData: Setter<T>;
};

/**
 * State for the Sortable Tree.
 * This state manages the tree structure and the DOM elements.
 * For each events from Sortable and method call,
 * this state sync the tree structure and the DOM elements.
 *
 * @typeParam T Type of the node data
 */
export class SortableTreeState<T> {
	/** Unique ID for the tree */
	id: string;
	/** Data attribute name to identify sortable tree state */
	dataAttrSortableID: string;
	/** Data attribute name to identify node */
	dataAttrID: string;

	/**
	 * Sortable options.
	 * Do not change directly after creating the state,
	 * instead use SortableTreeState#updateOptions to change the options.
	 */
	options: Sortable.Options;

	/** SolidJS Component which will be rendered to each sortable items */
	itemComponent: Component<Props<T>>;

	/** Assigned nodes */
	nodes: Map<NodeID, NodeW<T>>;

	/**
	 * Root node of the tree.
	 * Note that the data of the root node is just dummy,
	 * and only the children of the root node will be used.
	 */
	root: NodeW<T>;

	// Event handlers
	onChange?: (self: SortableTreeState<T>) => void;

	constructor(itemComponent: Component<Props<T>>, options?: Sortable.Options) {
		this.id = uID();
		this.dataAttrSortableID = "data-sortable-id";
		this.dataAttrID = "data-id";

		this.itemComponent = itemComponent;
		this.nodes = new Map();

		this.options = {};
		this.updateOptions(options || {});

		const node: Node<T> = {
			children: [],
		} as any;

		this.root = this.assignNode(node);
	}

	/**
	 * Dispose the tree state.
	 * This will remove all Sortable objects created by this state,
	 * and dispose SolidJS components rendered.
	 * Sicne this will remove all nodes including the root node,
	 * you cannot reuse the tree state after disposing.
	 */
	dispose() {
		// Clean-up all the nodes (also remove dom and dispose)
		for (const node of this.nodes.values()) {
			this.deleteNode(node);
		}
		this.nodes.clear();
	}

	/**
	 * Insert a new node into the tree based on the given node data.
	 * It'll copy the node data and make internal representation, NodeW.
	 * @param node Node data to insert
	 * @return Created NodeW object
	 */
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
			() => <Component s={this} data={data()} setData={setData} id={id} />,
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

	/**
	 * Link the node to the parent node.
	 * This will insert the node into both of NodeW Tree and DOM.
	 * @param node Node to link
	 * @param parent Parent node
	 * @param index Index to insert the node. If not provided, the node will be appended to the end.
	 */
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

	/**
	 * Unlink the node from the parent node.
	 * This will remove the node from both of NodeW Tree and DOM.
	 * @param node Node to unlink
	 */
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

	/**
	 * Generate new unique ID. This may not be unique via multiple trees.
	 * @returns New unique ID
	 */
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

	/**
	 * Update the options of the Sortable object.
	 * @param options New options
	 */
	updateOptions(options: Sortable.Options) {
		// Update options with update some options
		this.options = {
			...this.options,
			...options,
			group: this.id,
			onEnd: (evt) => {
				let items = evt.items;
				if(items.length === 0) items = [evt.item];
				const ids = items.map((item: Element) => item.getAttribute(this.dataAttrID)!);

				const to = evt.to;
				const toID = to.parentElement!.getAttribute(this.dataAttrID)!;

				console.log("Items", ids);
				console.log("onEnd", evt);
				console.log("Data", this.convertToNodes());
				console.log("DOM", this.convertToNodesFromDOM());
			},
		};

		// Update options of all Sortable objects
		for (const node of this.nodes.values()) {
			if (node.children) {
				for (const [key, value] of Object.entries(this.options)) {
					node.children.sortable.option(key as any, value);
				}
			}
		}
	}

	/**
	 * Traverse the tree and call the callback for each node.
	 * @param callback Callback function
	 */
	forEach(callback: (node: NodeW<T>, index: number, parent: NodeW<T>) => void) {
		const traverse = (parent: NodeW<T>) => {
			const children = parent.children;
			if (!children) return;
			const n = children.w.length;
			for(let i = 0; i < n; i++) {
				const node = children.w[i];
				callback(node, i, parent);
				traverse(node);
			}
		};
		traverse(this.root);
	}

	/**
	 * Traverse the tree and call the callback for each node.
	 * Note that this function traverse based on the DOM structure.
	 * @param callback Callback function
	 */
	forEachDOM(callback: (node: NodeW<T>, index: number, parent: NodeW<T>) => void) {
		const traverse = (parent: NodeW<T>) => {
			const children = parent.children;
			if(!children) return;
			let i=0, child: Element | null = children.container.firstElementChild;
			while(child) {
				const nodeID = child.getAttribute(this.dataAttrID);
				const node = this.nodes.get(nodeID!);
				if(!node) throw new Error(`Node not found: ${nodeID}`);
				callback(node, i, parent);
				traverse(node);
				child = child.nextElementSibling;
				i++;
			}
		};
		traverse(this.root);
	}

	/**
	 * Convert the tree to Node array.
	 * @returns Node array
	 */
	convertToNodes(): Node<T>[] {
		const [callback, getter] = nodeWToNodeCallback(this.root);
		this.forEach(callback);
		return getter();
	}

	/**
	 * Convert the tree to Node array based on the DOM structure.
	 * @returns Node array
	 */
	convertToNodesFromDOM(): Node<T>[] {
		const [callback, getter] = nodeWToNodeCallback(this.root);
		this.forEachDOM(callback);
		return getter();
	}

	/**
	 * Return the root DOM element of the tree.
	 * Note that since the data of the root node is just dummy,
	 * This element is just a children container of the root node.
	 * @returns Root element
	 */
	getRootElem() {
		return this.root.children!.container;
	}

	/**
	 * Get node by ID
	 * @param id Node ID to find
	 * @returns NodeW object
	 */
	getNodeByID(id: NodeID): NodeW<T> {
		const node = this.nodes.get(id);
		if (!node) throw new Error(`Node not found: ${id}`);
		return node;
	}

	/**
	 * Insert node to the tree
	 * @param node Node data
	 * @param parentID Parent node ID
	 * @param index Index to insert the node. If not provided, the node will be appended to the end.
	 * @returns New (inserted) node ID
	 */
	insertNode(node: Node<T>, parentID: NodeID, index?: number): NodeID {
		const parent = this.getNodeByID(parentID);
		const nodeW = this.assignNode(node);
		this.linkNodeToParent(nodeW, parent, index);
		return nodeW.id;
	}

	/**
	 * Delete the given node from tree.
	 * @param node NodeW object to remove
	 */
	deleteNode(node: NodeW<T>) {
		if (node.children) {
			node.children.sortable.destroy();
			for (const child of node.children.w) {
				this.deleteNode(child);
			}
		}
		node.dispose();
		node.elem.remove();
	}

	/**
	 * Delete the given node from tree.
	 * @param id Node ID to remove
	 */
	deleteNodeByID(id: NodeID) {
		this.deleteNode(this.getNodeByID(id));
	}
}
