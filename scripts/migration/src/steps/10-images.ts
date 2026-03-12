import { getPrisma } from '../pg-target';
import { query } from '../mysql-source';
import { mapId, requireId, getId } from '../id-map';

/**
 * Step 10: Migrate patient images.
 *
 * MySQL: images_patient (id, foto (S3 URL), is_favorite, is_recent, patient_id, timestamps)
 *
 * PG: patient_images (id, patientId, s3Key, s3Bucket, fileName, isFavorite, isBefore, isAfter, ...)
 *
 * Transformation: Extract S3 key from full URL.
 * e.g. "https://bucket.s3.region.amazonaws.com/patients/123/photo.jpg"
 *    → s3Key: "patients/123/photo.jpg"
 */

function extractS3Key(url: string | null): { key: string; bucket: string | null; fileName: string | null } | null {
  if (!url || url.trim() === '') return null;

  try {
    // Try to parse as URL
    const parsed = new URL(url);
    // S3 URL patterns:
    // https://bucket.s3.region.amazonaws.com/key
    // https://s3.region.amazonaws.com/bucket/key
    // https://bucket.s3.amazonaws.com/key
    let key = parsed.pathname.startsWith('/') ? parsed.pathname.slice(1) : parsed.pathname;
    const bucket = parsed.hostname.split('.')[0];
    const fileName = key.split('/').pop() || null;

    return { key: decodeURIComponent(key), bucket, fileName };
  } catch {
    // If not a valid URL, treat the whole string as the key
    const fileName = url.split('/').pop() || null;
    return { key: url, bucket: null, fileName };
  }
}

export async function runImages(): Promise<void> {
  const prisma = getPrisma();

  const mysqlImages = await query<{
    id: number;
    foto: string | null;
    is_favorite: number;
    is_recent: number;
    patient_id: number;
    created_at: Date;
    updated_at: Date;
  }>('SELECT * FROM images_patient');

  let skipped = 0;
  let noUrl = 0;

  for (const img of mysqlImages) {
    const uuid = mapId('images_patient', img.id);

    let patientId: string;
    try {
      patientId = requireId('patients', img.patient_id);
    } catch {
      skipped++;
      continue;
    }

    const s3Info = extractS3Key(img.foto);
    if (!s3Info) {
      noUrl++;
      continue;
    }

    await prisma.patientImage.create({
      data: {
        id: uuid,
        patientId,
        s3Key: s3Info.key,
        s3Bucket: s3Info.bucket,
        fileName: s3Info.fileName,
        isFavorite: img.is_favorite === 1,
        isBefore: false, // Legacy doesn't have this distinction
        isAfter: img.is_recent === 1, // is_recent maps to isAfter
        createdAt: img.created_at,
        updatedAt: img.updated_at,
      },
    });
  }

  console.log(`  Migrated ${mysqlImages.length - skipped - noUrl} images (${skipped} skipped, ${noUrl} no URL)`);
}
