// Return a random string based on Math.random (36-base)
export const randomString = () => Math.random().toString(36).substring(2);

// Return a string which may be usable as a unique identifier
let uIDCounter = 0;
export const uID = () => {
	const c = uIDCounter;
	uIDCounter = (uIDCounter + 1) % 1679616; // 36^4
	return `${Date.now().toString(36)}-${c.toString(36)}-${randomString()}`;
};
