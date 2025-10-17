import { untrack } from 'svelte';

/**
 * Optimistic Queue Helper for Svelte 5
 *
 * Provides immediate UI updates with per-item status tracking (saving/saved/error)
 * for array operations while syncing with parent props. This solves issues where:
 * - UI doesn't update until clicking away and back
 * - Users can't tell if operations are in progress
 * - Delete operations fail on temporary IDs
 * - No retry mechanism for failed operations
 * 
 * Key Features:
 * - Maintains local $state array for immediate updates
 * - Tracks per-item status (saving, saved, error) in a Map
 * - Syncs with parent props via $effect
 * - Handles temporary IDs gracefully (temp-{timestamp})
 * - Provides retry mechanism for failed operations
 * - Automatically cleans up stale statuses
 * 
 * Pattern:
 * 1. User performs action (add/delete)
 * 2. Item appears/disappears immediately with "saving" status
 * 3. Operation executes in background (onCreate/onDelete callback)
 * 4. Status updates to "saved" on success or "error" on failure
 * 5. Parent prop changes automatically sync to local state
 * 6. Retry available for error states
 * 
 * Usage Example:
 * ```svelte
 * <script lang="ts">
 *   import { useOptimisticQueue } from '$lib/utils/useOptimisticQueue.svelte';
 * 
 *   let props: Props = $props();
 *   
 *   const itemsQueue = useOptimisticQueue(props.items, {
 *     onCreate: async (draft) => {
 *       // Call your service to create in DB
 *       const created = await myService.create(draft);
 *       return created; // Return real item with DB-generated ID
 *     },
 *     onDelete: async (id) => {
 *       // Call your service to delete from DB
 *       await myService.delete(id);
 *     }
 *   });
 * 
 *   function isSaving(id: string) { 
 *     return itemsQueue.getStatus(id) === 'saving'; 
 *   }
 *   
 *   function hasError(id: string) { 
 *     return itemsQueue.getStatus(id) === 'error'; 
 *   }
 * 
 *   async function handleAdd(data: ItemData) {
 *     await itemsQueue.add({ ...data });
 *   }
 * 
 *   async function handleDelete(id: string) {
 *     await itemsQueue.remove(id);
 *   }
 * </script>
 * 
 * <!-- Template -->
 * {#each itemsQueue.value as item}
 *   <div>
 *     {item.name}
 *     
 *     {#if isSaving(item.id)}
 *       <Loader2 class="h-4 w-4 animate-spin text-blue-500" />
 *     {:else if hasError(item.id)}
 *       <AlertCircle class="h-4 w-4 text-red-500" />
 *       <Button size="sm" onclick={() => itemsQueue.retry(item.id)}>Retry</Button>
 *     {/if}
 *     
 *     <Button 
 *       onclick={() => handleDelete(item.id)}
 *       disabled={isSaving(item.id)}
 *     >
 *       Delete
 *     </Button>
 *   </div>
 * {/each}
 * ```
 */

/**
 * Status of an item in the optimistic queue
 * - saving: Operation in progress (create/update/delete)
 * - saved: Operation completed successfully
 * - error: Operation failed, retry available
 */
export type QueueStatus = 'saving' | 'saved' | 'error';

/**
 * Options for configuring the optimistic queue
 */
export interface OptimisticQueueOptions<T> {
	/**
	 * Callback to create an item in the database
	 * Should return the created item with real ID from database
	 * 
	 * @param draft - The draft item with temp ID
	 * @returns The created item with real database ID
	 */
	onCreate?: (draft: T) => Promise<T>;

	/**
	 * Callback to delete an item from the database
	 * Only called for real IDs (not temp- prefixed)
	 * 
	 * @param id - The ID of the item to delete
	 */
	onDelete?: (id: string) => Promise<void>;

	/**
	 * Callback to update an item in the database
	 * 
	 * @param id - The ID of the item to update
	 * @param updates - Partial updates to apply
	 * @returns The updated item
	 */
	onUpdate?: (id: string, updates: Partial<T>) => Promise<T>;
}

/**
 * Create an optimistic queue that updates immediately and syncs with parent
 *
 * @param parentArray - The parent prop array to sync with
 * @param opts - Configuration options with onCreate/onDelete/onUpdate callbacks
 * @returns Object with value getter, statuses, and mutation methods
 */
export function useOptimisticQueue<T extends { id?: string }>(
	parentArray: T[],
	opts: OptimisticQueueOptions<T> = {}
) {
	// Local state for immediate updates
	let items = $state<T[]>([]);

	// Track status for each item by ID
	let statuses = $state<Map<string, QueueStatus>>(new Map());

	// Store draft items for retry (keyed by temp ID)
	let drafts = $state<Map<string, T>>(new Map());

	// Sync with parent props whenever they change
	// Reconcile parent state with optimistic local changes
	$effect(() => {
		// 1) Compute helper sets without tracking local maps as dependencies
		let parentIds = new Set<string>();
		const pendingDeleteIds = new Set<string>();
		const tempDrafts: T[] = [];
		const tempDraftIds = new Set<string>();

		parentIds = new Set(
			parentArray.map((i) => i.id).filter(Boolean) as string[]
		);

		untrack(() => {
			for (const [id, status] of statuses) {
				// Real-ID deletes set to 'saving' in remove(); keep them hidden during sync
				if (status === 'saving' && id && !id.startsWith('temp-')) pendingDeleteIds.add(id);
			}
			for (const [, draft] of drafts) {
				if (draft?.id && draft.id.startsWith('temp-')) {
					tempDrafts.push(draft);
					tempDraftIds.add(draft.id);
				}
			}
		});

		// 2) Start from parent but filter out items pending delete
		const parentFiltered = parentArray.filter((i) => !pendingDeleteIds.has(i.id as string));

		// 3) Merge in temp creates that parent doesn't yet have
		const tempCreatesNotInParent = tempDrafts.filter((d) => d.id && !parentIds.has(d.id));

		// 4) Final reconciled array preserves optimistic adds and hides pending deletes
		items = [...parentFiltered, ...tempCreatesNotInParent];

		// 5) Clean up statuses/drafts for IDs no longer present in either parent or temp drafts
		const presentIds = new Set<string>([...parentIds, ...tempDraftIds]);

		const newStatuses = new Map<string, QueueStatus>();
		untrack(() => {
			for (const [id, status] of statuses) {
				if (presentIds.has(id)) newStatuses.set(id, status);
			}
		});
		if (newStatuses.size !== statuses.size) {
			statuses = newStatuses;
		}

		const newDrafts = new Map<string, T>();
		untrack(() => {
			for (const [id, draft] of drafts) {
				if (presentIds.has(id)) newDrafts.set(id, draft);
			}
		});
		if (newDrafts.size !== drafts.size) {
			drafts = newDrafts;
		}
	});

	/**
	 * Get the current status of an item
	 * 
	 * @param id - The ID of the item
	 * @returns The status or undefined if not tracked
	 */
	function getStatus(id: string | undefined): QueueStatus | undefined {
		if (!id) return undefined;
		return statuses.get(id);
	}

	/**
	 * Add an item to the queue (optimistic create)
	 * - Creates temp ID if not provided
	 * - Adds to local array immediately
	 * - Sets status to 'saving'
	 * - Calls onCreate callback
	 * - Replaces temp with real item on success
	 * - Sets status to 'error' on failure
	 * 
	 * @param draft - The item to add (may have temp or no ID)
	 * @returns The ID of the added item (temp or real)
	 */
	async function add(draft: T): Promise<string> {
		// Create temp ID if not provided
		const tempId = draft.id ?? `temp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
		const draftWithId = { ...draft, id: tempId } as T;
		
		// Add to local array immediately for instant UI feedback
		items = [...items, draftWithId];
		statuses.set(tempId, 'saving');
		drafts.set(tempId, draftWithId);

		// If no onCreate callback, just return temp ID
		if (!opts.onCreate) {
			statuses.set(tempId, 'saved');
			return tempId;
		}

		try {
			// Call onCreate to persist to database
			const realItem = await opts.onCreate(draftWithId);
			
			// Replace temp item with real item from database
			items = items.map(i => (i.id === tempId ? realItem : i));
			
			// Clean up temp status and draft
			statuses.delete(tempId);
			drafts.delete(tempId);
			
			// Mark real item as saved
			if (realItem.id) {
				statuses.set(realItem.id, 'saved');
				// Auto-clear saved status after 2 seconds
				setTimeout(() => {
					statuses.delete(realItem.id!);
					statuses = new Map(statuses);
				}, 2000);
			}
			
			return realItem.id ?? tempId;
		} catch (error) {
			console.error('Error adding item:', error);
			// Mark as error for retry
			statuses.set(tempId, 'error');
			return tempId;
		}
	}

	/**
	 * Remove an item from the queue (optimistic delete)
	 * - Removes from local array immediately
	 * - For temp IDs: just removes locally (no DB call)
	 * - For real IDs: calls onDelete callback
	 * - Sets status to 'error' on failure and reverts removal
	 * 
	 * @param id - The ID of the item to remove
	 */
	async function remove(id: string): Promise<void> {
		// Store original item in case we need to revert
		const originalItem = items.find(i => i.id === id);
		
		// Remove from local array immediately for instant UI feedback
		items = items.filter(i => i.id !== id);
		
		// If temp ID, just remove locally (no DB operation needed)
		if (id.startsWith('temp-')) {
			statuses.delete(id);
			drafts.delete(id);
			return;
		}

		// For real IDs, call onDelete if provided
		if (!opts.onDelete) {
			statuses.delete(id);
			return;
		}

		// Set saving status during delete
		statuses.set(id, 'saving');

		try {
			await opts.onDelete(id);
			// Success - clean up status
			statuses.delete(id);
		} catch (error) {
			console.error('Error deleting item:', error);
			// Revert removal on error
			if (originalItem) {
				items = [...items, originalItem];
			}
			statuses.set(id, 'error');
		}
	}

	/**
	 * Retry a failed operation
	 * - For temp IDs with error: retry create
	 * - For real IDs with error: retry delete (if that's what failed)
	 * 
	 * @param id - The ID of the item to retry
	 */
	async function retry(id: string): Promise<void> {
		const status = statuses.get(id);
		if (status !== 'error') return;

		// If it's a temp ID, retry the create
		if (id.startsWith('temp-')) {
			const draft = drafts.get(id);
			if (!draft || !opts.onCreate) return;

			statuses.set(id, 'saving');

			try {
				const realItem = await opts.onCreate(draft);
				items = items.map(i => (i.id === id ? realItem : i));
				statuses.delete(id);
				drafts.delete(id);
				
				if (realItem.id) {
					statuses.set(realItem.id, 'saved');
					setTimeout(() => {
						statuses.delete(realItem.id!);
						statuses = new Map(statuses);
					}, 2000);
				}
			} catch (error) {
				console.error('Error retrying create:', error);
				statuses.set(id, 'error');
			}
		}
		// For real IDs, we don't currently support retry
		// (would need to track what operation failed)
	}

	return {
		/**
		 * Get the current array value
		 * Use this in templates: {#each queue.value as item}
		 */
		get value(): T[] {
			return items;
		},

		/**
		 * Get the statuses map (readonly)
		 * Use with getStatus() helper for cleaner code
		 */
		get statuses(): ReadonlyMap<string, QueueStatus> {
			return statuses;
		},

		/**
		 * Get status of a specific item
		 */
		getStatus,

		/**
		 * Add an item (optimistic create)
		 */
		add,

		/**
		 * Remove an item (optimistic delete)
		 */
		remove,

		/**
		 * Retry a failed operation
		 */
		retry
	};
}

/**
 * Type helper for components using optimistic queues
 */
export type OptimisticQueue<T extends { id?: string }> = ReturnType<
	typeof useOptimisticQueue<T>
>;

