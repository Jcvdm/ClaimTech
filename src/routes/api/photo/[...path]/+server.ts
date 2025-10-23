import { error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

/**
 * Authenticated Photo Proxy Endpoint
 * 
 * This endpoint serves photos from the private 'SVA Photos' Supabase storage bucket.
 * It authenticates users via RLS policies and streams photos with proper caching headers.
 * 
 * Usage: <img src="/api/photo/assessments/{assessment_id}/identification/registration/photo.jpg" />
 * 
 * Benefits:
 * - No CORS/ORB issues (same-origin request)
 * - Private storage with RLS enforcement
 * - Proper caching for performance
 * - Works with <img> tags
 */

const BUCKET_NAME = 'SVA Photos';

// Map file extensions to MIME types
const MIME_TYPES: Record<string, string> = {
	jpg: 'image/jpeg',
	jpeg: 'image/jpeg',
	png: 'image/png',
	gif: 'image/gif',
	webp: 'image/webp',
	svg: 'image/svg+xml',
	bmp: 'image/bmp',
	ico: 'image/x-icon'
};

/**
 * GET /api/photo/[...path]
 * 
 * Streams a photo from private storage with authentication
 */
export const GET: RequestHandler = async ({ params, locals, request }) => {
	// Get the full path from catch-all parameter
	const photoPath = params.path;

	if (!photoPath) {
		throw error(400, 'Photo path is required');
	}

	// Check if user is authenticated
	const {
		data: { session }
	} = await locals.supabase.auth.getSession();

	if (!session) {
		throw error(401, 'Authentication required');
	}

	try {
		// Download photo from private bucket using authenticated client
		// RLS policies will enforce access control
		const { data: photoBlob, error: downloadError } = await locals.supabase.storage
			.from(BUCKET_NAME)
			.download(photoPath);

		if (downloadError) {
			console.error('Error downloading photo:', downloadError);
			throw error(404, 'Photo not found');
		}

		if (!photoBlob) {
			throw error(404, 'Photo not found');
		}

		// Determine content type from file extension
		const extension = photoPath.split('.').pop()?.toLowerCase() || 'jpg';
		const contentType = MIME_TYPES[extension] || 'image/jpeg';

		// Convert Blob to ArrayBuffer for Response
		const arrayBuffer = await photoBlob.arrayBuffer();

		// Generate ETag for caching (simple hash of path + size)
		const etag = `"${Buffer.from(photoPath).toString('base64').substring(0, 16)}-${arrayBuffer.byteLength}"`;

		// Check if client has cached version (If-None-Match header)
		const clientEtag = request.headers.get('if-none-match');
		if (clientEtag === etag) {
			// Client has current version, return 304 Not Modified
			return new Response(null, {
				status: 304,
				headers: {
					'ETag': etag,
					'Cache-Control': 'private, max-age=3600' // 1 hour
				}
			});
		}

		// Return photo with proper headers
		return new Response(arrayBuffer, {
			status: 200,
			headers: {
				'Content-Type': contentType,
				'Content-Length': arrayBuffer.byteLength.toString(),
				'Cache-Control': 'private, max-age=3600', // Browser can cache for 1 hour
				'ETag': etag,
				// Security headers
				'X-Content-Type-Options': 'nosniff',
				// Allow CORS for same-origin (optional, but explicit)
				'Access-Control-Allow-Origin': request.headers.get('origin') || '*',
				'Access-Control-Allow-Credentials': 'true'
			}
		});
	} catch (err) {
		console.error('Error serving photo:', err);
		
		// If it's already a SvelteKit error, rethrow it
		if (err && typeof err === 'object' && 'status' in err) {
			throw err;
		}
		
		// Otherwise, return 500
		throw error(500, 'Failed to load photo');
	}
};

/**
 * OPTIONS /api/photo/[...path]
 * 
 * Handle CORS preflight requests
 */
export const OPTIONS: RequestHandler = async ({ request }) => {
	return new Response(null, {
		status: 204,
		headers: {
			'Access-Control-Allow-Origin': request.headers.get('origin') || '*',
			'Access-Control-Allow-Methods': 'GET, OPTIONS',
			'Access-Control-Allow-Headers': 'Content-Type, Authorization',
			'Access-Control-Allow-Credentials': 'true',
			'Access-Control-Max-Age': '86400' // 24 hours
		}
	});
};

