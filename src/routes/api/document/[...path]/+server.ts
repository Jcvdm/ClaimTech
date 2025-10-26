import { error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

const BUCKET_NAME = 'documents';

/**
 * Authenticated proxy endpoint for serving documents from private storage
 * 
 * This endpoint:
 * 1. Authenticates the user via session
 * 2. Downloads the document from the private 'documents' bucket
 * 3. Streams it back to the browser with proper headers
 * 4. Supports PDFs and ZIP files
 * 
 * Benefits:
 * - No CORS/ORB issues (same-origin request)
 * - Works with private buckets
 * - Proper authentication enforcement
 * - Browser caching support
 */
export const GET: RequestHandler = async ({ params, locals, request }) => {
	const documentPath = params.path;

	if (!documentPath) {
		throw error(400, 'Document path is required');
	}

	// Authenticate user (secure JWT validation)
	const { session, user } = await locals.safeGetSession();

	if (!session || !user) {
		throw error(401, 'Authentication required');
	}

	// Download document from private bucket
	const { data: documentBlob, error: downloadError } = await locals.supabase.storage
		.from(BUCKET_NAME)
		.download(documentPath);

	if (downloadError || !documentBlob) {
		console.error('Document download error:', downloadError);
		throw error(404, 'Document not found');
	}

	// Determine content type based on file extension
	const extension = documentPath.split('.').pop()?.toLowerCase();
	let contentType = 'application/octet-stream';
	let contentDisposition = 'attachment';

	switch (extension) {
		case 'pdf':
			contentType = 'application/pdf';
			// For PDFs, use inline to open in browser, but allow download
			contentDisposition = 'inline';
			break;
		case 'zip':
			contentType = 'application/zip';
			contentDisposition = 'attachment';
			break;
		case 'jpg':
		case 'jpeg':
			contentType = 'image/jpeg';
			contentDisposition = 'inline';
			break;
		case 'png':
			contentType = 'image/png';
			contentDisposition = 'inline';
			break;
		default:
			contentType = 'application/octet-stream';
			contentDisposition = 'attachment';
	}

	// Get filename from path
	const filename = documentPath.split('/').pop() || 'document';

	// Convert blob to array buffer
	const arrayBuffer = await documentBlob.arrayBuffer();

	// Generate ETag for caching (based on path and size)
	const etag = `"${Buffer.from(documentPath).toString('base64').substring(0, 16)}-${arrayBuffer.byteLength}"`;

	// Check if client has cached version
	const clientEtag = request.headers.get('if-none-match');
	if (clientEtag === etag) {
		return new Response(null, {
			status: 304,
			headers: {
				ETag: etag,
				'Cache-Control': 'private, max-age=3600'
			}
		});
	}

	// Return document with proper headers
	return new Response(arrayBuffer, {
		status: 200,
		headers: {
			'Content-Type': contentType,
			'Content-Length': arrayBuffer.byteLength.toString(),
			'Content-Disposition': `${contentDisposition}; filename="${filename}"`,
			'Cache-Control': 'private, max-age=3600', // 1 hour cache
			ETag: etag,
			'X-Content-Type-Options': 'nosniff',
			'Access-Control-Allow-Origin': '*',
			'Access-Control-Allow-Credentials': 'true'
		}
	});
};

/**
 * Handle CORS preflight requests
 */
export const OPTIONS: RequestHandler = async () => {
	return new Response(null, {
		status: 204,
		headers: {
			'Access-Control-Allow-Origin': '*',
			'Access-Control-Allow-Methods': 'GET, OPTIONS',
			'Access-Control-Allow-Headers': 'Content-Type, Authorization',
			'Access-Control-Max-Age': '86400'
		}
	});
};

