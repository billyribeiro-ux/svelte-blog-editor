import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types.js';
import { db } from '$lib/server/db/client.js';
import { insertMedia } from '$lib/server/db/queries.js';
import sharp from 'sharp';
import { env } from '$env/dynamic/private';
import { writeFile, mkdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { join } from 'node:path';

const ACCEPTED_TYPES = new Set([
	'image/jpeg',
	'image/png',
	'image/webp',
	'image/avif',
	'image/gif'
]);

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

interface SizeVariant {
	suffix: string;
	width: number;
}

const SIZE_VARIANTS: SizeVariant[] = [
	{ suffix: 'thumbnail', width: 150 },
	{ suffix: 'medium', width: 300 },
	{ suffix: 'large', width: 1024 }
];

/**
 * POST /api/editor/upload
 * Accepts multipart/form-data with an image file.
 * Processes with Sharp: generates WebP + AVIF versions at multiple sizes.
 * Storage backend is feature-flagged via STORAGE_BACKEND env var.
 */
export const POST: RequestHandler = async ({ request }) => {
	let formData: FormData;
	try {
		formData = await request.formData();
	} catch {
		return error(400, 'Request must be multipart/form-data with a file field.');
	}
	const file = formData.get('file');

	if (!file || !(file instanceof File)) {
		return error(400, 'No file provided');
	}

	if (!ACCEPTED_TYPES.has(file.type)) {
		return error(400, `Invalid file type: ${file.type}. Accepted: JPEG, PNG, WebP, AVIF, GIF.`);
	}

	if (file.size > MAX_FILE_SIZE) {
		return error(400, `File too large. Maximum: ${MAX_FILE_SIZE / (1024 * 1024)}MB.`);
	}

	const buffer = Buffer.from(await file.arrayBuffer());
	const originalName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
	/* Strip extension, collapse dots/double-dots to prevent path traversal */
	const baseName =
		originalName
			.replace(/\.[^.]+$/, '')
			.replace(/\.+/g, '_')
			.replace(/^_+|_+$/g, '') || 'upload';
	const timestamp = Date.now();
	const now = new Date();
	const year = now.getFullYear().toString();
	const month = (now.getMonth() + 1).toString().padStart(2, '0');

	try {
		/* Single Sharp pass: strip EXIF via rotate() and extract metadata */
		const pipeline = sharp(buffer).rotate();
		const metadata = await pipeline.metadata();
		const naturalWidth = metadata.width ?? 0;
		const naturalHeight = metadata.height ?? 0;
		const cleanBuffer = await pipeline.toBuffer();

		const storageBackend = env.STORAGE_BACKEND || 'local';
		const urls: Record<string, string> = {};

		if (storageBackend === 'r2') {
			/* Full size WebP */
			urls.full = await uploadToR2(
				await sharp(cleanBuffer).webp({ quality: 85 }).toBuffer(),
				`${year}/${month}/${baseName}-${timestamp}-full.webp`,
				'image/webp'
			);

			/* Full size AVIF */
			urls.fullAvif = await uploadToR2(
				await sharp(cleanBuffer).avif({ quality: 65 }).toBuffer(),
				`${year}/${month}/${baseName}-${timestamp}-full.avif`,
				'image/avif'
			);

			/* Size variants in WebP + AVIF */
			for (const variant of SIZE_VARIANTS) {
				const resizedWebp = await sharp(cleanBuffer)
					.resize({ width: variant.width, withoutEnlargement: true })
					.webp({ quality: 82 })
					.toBuffer();
				urls[variant.suffix] = await uploadToR2(
					resizedWebp,
					`${year}/${month}/${baseName}-${timestamp}-${variant.suffix}.webp`,
					'image/webp'
				);

				const resizedAvif = await sharp(cleanBuffer)
					.resize({ width: variant.width, withoutEnlargement: true })
					.avif({ quality: 60 })
					.toBuffer();
				urls[`${variant.suffix}Avif`] = await uploadToR2(
					resizedAvif,
					`${year}/${month}/${baseName}-${timestamp}-${variant.suffix}.avif`,
					'image/avif'
				);
			}
		} else {
			const uploadDir = join('static', 'uploads', year, month);
			if (!existsSync(uploadDir)) {
				await mkdir(uploadDir, { recursive: true });
			}

			/* Full size WebP */
			const fullWebp = await sharp(cleanBuffer).webp({ quality: 85 }).toBuffer();
			const fullWebpFilename = `${baseName}-${timestamp}-full.webp`;
			await writeFile(join(uploadDir, fullWebpFilename), fullWebp);
			urls.full = `/uploads/${year}/${month}/${fullWebpFilename}`;

			/* Full size AVIF */
			const fullAvif = await sharp(cleanBuffer).avif({ quality: 65 }).toBuffer();
			const fullAvifFilename = `${baseName}-${timestamp}-full.avif`;
			await writeFile(join(uploadDir, fullAvifFilename), fullAvif);
			urls.fullAvif = `/uploads/${year}/${month}/${fullAvifFilename}`;

			/* Size variants in WebP + AVIF */
			for (const variant of SIZE_VARIANTS) {
				const resizedWebp = await sharp(cleanBuffer)
					.resize({ width: variant.width, withoutEnlargement: true })
					.webp({ quality: 82 })
					.toBuffer();
				const webpFilename = `${baseName}-${timestamp}-${variant.suffix}.webp`;
				await writeFile(join(uploadDir, webpFilename), resizedWebp);
				urls[variant.suffix] = `/uploads/${year}/${month}/${webpFilename}`;

				const resizedAvif = await sharp(cleanBuffer)
					.resize({ width: variant.width, withoutEnlargement: true })
					.avif({ quality: 60 })
					.toBuffer();
				const avifFilename = `${baseName}-${timestamp}-${variant.suffix}.avif`;
				await writeFile(join(uploadDir, avifFilename), resizedAvif);
				urls[`${variant.suffix}Avif`] = `/uploads/${year}/${month}/${avifFilename}`;
			}
		}

		/* Save to media table */
		insertMedia(db, {
			filename: `${baseName}-${timestamp}-full.webp`,
			original_name: originalName,
			mime_type: 'image/webp',
			size_bytes: file.size,
			width: naturalWidth,
			height: naturalHeight,
			url: urls.full,
			thumbnail_url: urls.thumbnail ?? '',
			medium_url: urls.medium ?? '',
			large_url: urls.large ?? '',
			alt_text: '',
			title: '',
			caption: '',
			description: ''
		});

		return json({
			url: urls.full,
			thumbnailUrl: urls.thumbnail,
			mediumUrl: urls.medium,
			largeUrl: urls.large,
			avifUrl: urls.fullAvif,
			thumbnailAvifUrl: urls.thumbnailAvif,
			mediumAvifUrl: urls.mediumAvif,
			largeAvifUrl: urls.largeAvif,
			width: naturalWidth,
			height: naturalHeight,
			format: 'webp',
			size: file.size
		});
	} catch (err) {
		console.error('Upload processing error:', err);
		return error(500, 'Failed to process image');
	}
};

/**
 * Lazily cached S3 client for R2 uploads.
 * Avoids re-creating the client (and re-importing the SDK) on every variant.
 */
let _r2Client: InstanceType<typeof import('@aws-sdk/client-s3').S3Client> | null = null;
let _r2BucketName = '';
let _r2PublicUrl = '';

async function getR2Client(): Promise<{
	client: InstanceType<typeof import('@aws-sdk/client-s3').S3Client>;
	bucketName: string;
	publicUrl: string;
}> {
	if (_r2Client) return { client: _r2Client, bucketName: _r2BucketName, publicUrl: _r2PublicUrl };

	const { S3Client } = await import('@aws-sdk/client-s3');

	const r2AccountId = env.R2_ACCOUNT_ID;
	const r2AccessKeyId = env.R2_ACCESS_KEY_ID;
	const r2SecretAccessKey = env.R2_SECRET_ACCESS_KEY;
	_r2BucketName = env.R2_BUCKET_NAME ?? '';
	_r2PublicUrl = env.R2_PUBLIC_URL ?? '';

	if (!r2AccountId || !r2AccessKeyId || !r2SecretAccessKey || !_r2BucketName) {
		throw new Error(
			'R2 configuration missing. Set R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET_NAME.'
		);
	}

	_r2Client = new S3Client({
		region: 'auto',
		endpoint: `https://${r2AccountId}.r2.cloudflarestorage.com`,
		credentials: {
			accessKeyId: r2AccessKeyId,
			secretAccessKey: r2SecretAccessKey
		}
	});

	return { client: _r2Client, bucketName: _r2BucketName, publicUrl: _r2PublicUrl };
}

/**
 * Upload a buffer to Cloudflare R2 via S3-compatible API.
 */
async function uploadToR2(buffer: Buffer, key: string, contentType: string): Promise<string> {
	const { PutObjectCommand } = await import('@aws-sdk/client-s3');
	const { client, bucketName, publicUrl } = await getR2Client();

	await client.send(
		new PutObjectCommand({
			Bucket: bucketName,
			Key: key,
			Body: buffer,
			ContentType: contentType
		})
	);

	return publicUrl ? `${publicUrl}/${key}` : `https://${bucketName}.r2.dev/${key}`;
}
