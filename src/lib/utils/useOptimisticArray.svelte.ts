/**
 * Optimistic Array Helper for Svelte 5
 * 
 * Provides immediate UI updates for array operations while syncing with parent props.
 * This solves the common issue where UI doesn't update until clicking away and back.
 * 
 * Pattern:
 * 1. Maintains local $state array for immediate updates
 * 2. Syncs with parent props via $effect
 * 3. Provides add/remove/update operations that update local state immediately
 * 4. Parent prop changes automatically sync to local state
 * 
 * Usage:
 * ```svelte
 * <script lang="ts">
 *   import { useOptimisticArray } from '$lib/utils/useOptimisticArray.svelte';
 *
 *   let props: Props = $props();
 *
 *   // ⚠️ CRITICAL: Pass getter function () => props.photos for reactivity
 *   // This ensures the utility tracks changes when parent updates the prop
 *   // Without the getter, the utility captures the initial value and won't sync
 *   const photos = useOptimisticArray(() => props.photos);
 *
 *   async function uploadPhoto(file: File) {
 *     const result = await uploadToStorage(file);
 *     const newPhoto = await createPhotoRecord(result);
 *
 *     // Updates UI immediately!
 *     photos.add(newPhoto);
 *
 *     // Refresh from parent (will sync via $effect)
 *     await onUpdate();
 *   }
 *
 *   async function deletePhoto(id: string) {
 *     // Updates UI immediately!
 *     photos.remove(id);
 *
 *     // Delete from database
 *     await deletePhotoRecord(id);
 *
 *     // Refresh from parent (will sync via $effect)
 *     await onUpdate();
 *   }
 *
 *   // Use in template
 *   {#each photos.value as photo}
 *     <img src={photo.url} />
 *   {/each}
 * </script>
 * ```
 */

/**
 * Create an optimistic array that updates immediately and syncs with parent
 * 
 * @param parentArray - The parent prop array to sync with (can be a getter function for better reactivity)
 * @returns Object with value getter and mutation methods
 */
export function useOptimisticArray<T extends { id: string }>(
	parentArray: T[] | (() => T[])
) {
	// Local state for immediate updates
	let localArray = $state<T[]>([]);

	// Create a derived value that tracks the parent array reactively
	// This ensures we detect changes even if the array reference stays the same
	// Using $derived.by() allows conditional logic inside
	const parentArrayValue = $derived.by(() => {
		return typeof parentArray === 'function' 
			? parentArray()
			: parentArray;
	});

	// Sync with parent props whenever they change
	// Using $derived ensures we track the array contents, not just the reference
	$effect(() => {
		const currentParent = parentArrayValue;
		// Always sync to ensure we have the latest data from parent
		// The comparison check prevents unnecessary updates but we need to ensure
		// we sync when parent data loads initially
		localArray = [...currentParent];
	});

	return {
		/**
		 * Get the current array value
		 * Use this in templates: {#each photos.value as photo}
		 */
		get value(): T[] {
			return localArray;
		},

		/**
		 * Add an item to the array (optimistic update)
		 * Updates UI immediately before parent prop updates
		 * 
		 * @param item - The item to add
		 */
		add(item: T): void {
			localArray = [...localArray, item];
		},

		/**
		 * Add multiple items to the array (optimistic update)
		 * Updates UI immediately before parent prop updates
		 * 
		 * @param items - The items to add
		 */
		addMany(items: T[]): void {
			localArray = [...localArray, ...items];
		},

		/**
		 * Remove an item from the array by id (optimistic update)
		 * Updates UI immediately before parent prop updates
		 * 
		 * @param id - The id of the item to remove
		 */
		remove(id: string): void {
			localArray = localArray.filter((item) => item.id !== id);
		},

		/**
		 * Remove multiple items from the array by ids (optimistic update)
		 * Updates UI immediately before parent prop updates
		 * 
		 * @param ids - The ids of the items to remove
		 */
		removeMany(ids: string[]): void {
			const idSet = new Set(ids);
			localArray = localArray.filter((item) => !idSet.has(item.id));
		},

		/**
		 * Update an item in the array by id (optimistic update)
		 * Updates UI immediately before parent prop updates
		 * 
		 * @param id - The id of the item to update
		 * @param updates - Partial updates to apply
		 */
		update(id: string, updates: Partial<T>): void {
			localArray = localArray.map((item) =>
				item.id === id ? { ...item, ...updates } : item
			);
		},

		/**
		 * Replace an item in the array by id (optimistic update)
		 * Updates UI immediately before parent prop updates
		 * 
		 * @param id - The id of the item to replace
		 * @param newItem - The new item to replace with
		 */
		replace(id: string, newItem: T): void {
			localArray = localArray.map((item) => (item.id === id ? newItem : item));
		},

		/**
		 * Reset the local array to match parent props
		 * Useful for error recovery or manual sync
		 */
		reset(): void {
			localArray = [...parentArrayValue];
		},

		/**
		 * Clear all items from the array (optimistic update)
		 * Updates UI immediately before parent prop updates
		 */
		clear(): void {
			localArray = [];
		},

		/**
		 * Set the entire array to a new value (optimistic update)
		 * Updates UI immediately before parent prop updates
		 * 
		 * @param newArray - The new array to set
		 */
		set(newArray: T[]): void {
			localArray = [...newArray];
		}
	};
}

/**
 * Type helper for components using optimistic arrays
 */
export type OptimisticArray<T extends { id: string }> = ReturnType<
	typeof useOptimisticArray<T>
>;

