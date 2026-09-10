type Listener = () => void;

const listeners = new Set<Listener>();

/** Subscribe a list view to data mutations. Returns an unsubscribe function. */
export function onDataChange(listener: Listener): () => void {
	listeners.add(listener);
	return () => {
		listeners.delete(listener);
	};
}

/** Notify subscribed views that data changed so they can refetch. */
export function notifyDataChange(): void {
	for (const listener of listeners) listener();
}
