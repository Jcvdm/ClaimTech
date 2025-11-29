/**
 * Drag-and-Drop Helper Utilities
 *
 * Provides utility functions to handle common drag-and-drop issues,
 * specifically the flickering problem caused by child element boundaries.
 */

/**
 * Determines if the drag state should be reset based on cursor position.
 *
 * The dragLeave event fires when the cursor leaves ANY element within the container,
 * including child elements. This causes flickering when dragging over buttons or
 * nested elements inside a drop zone.
 *
 * This function checks if the cursor has actually left the container's boundary,
 * not just moved to a child element.
 *
 * @param event - The DragEvent from handleDragLeave
 * @returns true if cursor is outside the container boundary, false otherwise
 *
 * @example
 * ```typescript
 * function handleDragLeave(event: DragEvent) {
 *     event.preventDefault();
 *     event.stopPropagation();
 *     if (shouldResetDragState(event)) {
 *         isDragging = false;
 *     }
 * }
 * ```
 */
export function shouldResetDragState(event: DragEvent): boolean {
	const rect = (event.currentTarget as HTMLElement).getBoundingClientRect();
	return (
		event.clientX <= rect.left ||
		event.clientX >= rect.right ||
		event.clientY <= rect.top ||
		event.clientY >= rect.bottom
	);
}
