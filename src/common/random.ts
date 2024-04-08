// Return a random string based on Math.random (36-base)
export const randomString = () => Math.random().toString(36).substring(2);

// Return a string which may be usable as a unique identifier
export const uId = () => `${Date.now().toString(36)}-${randomString()}`;
