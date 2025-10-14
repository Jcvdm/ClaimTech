/**
 * Utility for creating Server-Sent Events (SSE) streaming responses
 * to prevent browser timeout during long-running operations like PDF generation
 */

export interface StreamProgress {
	status: 'processing' | 'complete' | 'error';
	progress: number; // 0-100
	message?: string;
	url?: string;
	error?: string;
}

/**
 * Creates a streaming response that sends progress updates via Server-Sent Events
 * 
 * @param generator - Async function that performs the work and yields progress updates
 * @returns Response object with SSE stream
 * 
 * @example
 * ```typescript
 * export const POST = async ({ request }) => {
 *   return createStreamingResponse(async function* () {
 *     yield { status: 'processing', progress: 0, message: 'Starting...' };
 *     
 *     // Do some work
 *     const result = await longRunningTask();
 *     
 *     yield { status: 'processing', progress: 50, message: 'Halfway there...' };
 *     
 *     // More work
 *     const finalResult = await anotherTask();
 *     
 *     yield { status: 'complete', progress: 100, url: finalResult };
 *   });
 * };
 * ```
 */
export function createStreamingResponse(
	generator: () => AsyncGenerator<StreamProgress, void, unknown>
): Response {
	const stream = new ReadableStream({
		async start(controller) {
			const encoder = new TextEncoder();
			const streamId = Math.random().toString(36).substring(7);

			console.log(`[${new Date().toISOString()}] [Stream ${streamId}] Starting streaming response`);

			try {
				let messageCount = 0;
				for await (const progress of generator()) {
					messageCount++;
					// Format as Server-Sent Event
					const data = JSON.stringify(progress);
					const message = `data: ${data}\n\n`;

					console.log(`[${new Date().toISOString()}] [Stream ${streamId}] Message #${messageCount} - Status: ${progress.status}, Progress: ${progress.progress}%, Message: ${progress.message || 'N/A'}`);

					// Check if controller is still open before enqueuing
					try {
						controller.enqueue(encoder.encode(message));
						console.log(`[${new Date().toISOString()}] [Stream ${streamId}] Message #${messageCount} enqueued successfully`);
					} catch (enqueueError) {
						console.error(`[${new Date().toISOString()}] [Stream ${streamId}] ❌ Failed to enqueue message #${messageCount}:`, enqueueError);
						console.error(`[${new Date().toISOString()}] [Stream ${streamId}] Controller state: desiredSize=${controller.desiredSize}`);
						throw enqueueError;
					}
				}

				console.log(`[${new Date().toISOString()}] [Stream ${streamId}] Generator completed. Total messages sent: ${messageCount}`);
				console.log(`[${new Date().toISOString()}] [Stream ${streamId}] Waiting 100ms before closing stream...`);

				// Give time for the last message to be transmitted before closing the stream
				await new Promise(resolve => setTimeout(resolve, 100));

				console.log(`[${new Date().toISOString()}] [Stream ${streamId}] Delay complete, closing stream now`);

			} catch (error) {
				console.error(`[${new Date().toISOString()}] [Stream ${streamId}] ERROR in generator:`, error);

				// Only try to send error if controller is still open
				try {
					// Send error event
					const errorProgress: StreamProgress = {
						status: 'error',
						progress: 0,
						error: error instanceof Error ? error.message : 'Unknown error occurred'
					};
					const data = JSON.stringify(errorProgress);
					const message = `data: ${data}\n\n`;

					console.log(`[${new Date().toISOString()}] [Stream ${streamId}] Sending error message to client`);
					controller.enqueue(encoder.encode(message));

					// Give time for the error message to be transmitted before closing the stream
					await new Promise(resolve => setTimeout(resolve, 100));

					console.log(`[${new Date().toISOString()}] [Stream ${streamId}] Error message sent, closing stream`);
				} catch (errorSendError) {
					console.error(`[${new Date().toISOString()}] [Stream ${streamId}] Could not send error message (controller already closed):`, errorSendError);
				}

			} finally {
				try {
					console.log(`[${new Date().toISOString()}] [Stream ${streamId}] Closing stream...`);
					controller.close();
					console.log(`[${new Date().toISOString()}] [Stream ${streamId}] Stream closed successfully`);
				} catch (closeError) {
					console.error(`[${new Date().toISOString()}] [Stream ${streamId}] Error closing stream (may already be closed):`, closeError);
				}
			}
		},
		cancel(reason) {
			const streamId = 'unknown';
			console.error(`[${new Date().toISOString()}] [Stream ${streamId}] ⚠️ STREAM CANCELLED BY CLIENT:`, reason);
		}
	});

	return new Response(stream, {
		headers: {
			'Content-Type': 'text/event-stream',
			'Cache-Control': 'no-cache',
			Connection: 'keep-alive'
		}
	});
}

/**
 * Helper to send periodic keep-alive pings during long operations
 * This prevents the connection from timing out
 * 
 * @param intervalMs - How often to send pings (default: 5000ms)
 * @returns Object with start() and stop() methods
 */
export function createKeepAlive(
	onPing: (progress: StreamProgress) => void,
	intervalMs: number = 5000
) {
	let interval: ReturnType<typeof setInterval> | null = null;
	let currentProgress = 0;

	return {
		start() {
			interval = setInterval(() => {
				// Increment progress slowly (max 90% until actually complete)
				currentProgress = Math.min(currentProgress + 5, 90);
				onPing({
					status: 'processing',
					progress: currentProgress,
					message: 'Generating document...'
				});
			}, intervalMs);
		},
		stop() {
			if (interval) {
				clearInterval(interval);
				interval = null;
			}
		},
		setProgress(progress: number) {
			currentProgress = progress;
		}
	};
}

