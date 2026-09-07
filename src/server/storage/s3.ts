import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { prisma } from "@/server/db";
import { sha256Buffer } from "@/server/auth/crypto";
import { nanoid } from "nanoid";

function s3() {
  const endpoint = process.env.S3_ENDPOINT;
  return new S3Client({
    region: process.env.S3_REGION ?? "us-east-1",
    endpoint,
    forcePathStyle: process.env.S3_FORCE_PATH_STYLE === "true",
    credentials: {
      accessKeyId: process.env.S3_ACCESS_KEY_ID ?? "",
      secretAccessKey: process.env.S3_SECRET_ACCESS_KEY ?? "",
    },
  });
}

function bucket() {
  return process.env.S3_BUCKET ?? "nova-portal";
}

export async function storePrivateFile(input: {
  buffer: Buffer;
  mimeType: string;
  originalName: string;
  prefix: string;
}) {
  const checksum = sha256Buffer(input.buffer);
  const existing = await prisma.documentFile.findFirst({
    where: { checksumSha256: checksum, bucket: bucket() },
  });
  if (existing) return existing;

  const key = `${input.prefix}/${nanoid()}-${input.originalName.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
  await s3().send(
    new PutObjectCommand({
      Bucket: bucket(),
      Key: key,
      Body: input.buffer,
      ContentType: input.mimeType,
      ServerSideEncryption: "AES256",
    }),
  );

  return prisma.documentFile.create({
    data: {
      storageKey: key,
      bucket: bucket(),
      mimeType: input.mimeType,
      sizeBytes: input.buffer.length,
      checksumSha256: checksum,
      originalName: input.originalName,
    },
  });
}

export async function getObjectBuffer(storageKey: string): Promise<Buffer> {
  const out = await s3().send(
    new GetObjectCommand({ Bucket: bucket(), Key: storageKey }),
  );
  const bytes = await out.Body?.transformToByteArray();
  if (!bytes) throw new Error("Empty object");
  return Buffer.from(bytes);
}

export async function getSignedDownloadUrl(storageKey: string, expiresIn = 120) {
  return getSignedUrl(
    s3(),
    new GetObjectCommand({ Bucket: bucket(), Key: storageKey }),
    { expiresIn },
  );
}

export async function objectExists(storageKey: string) {
  try {
    await s3().send(new HeadObjectCommand({ Bucket: bucket(), Key: storageKey }));
    return true;
  } catch {
    return false;
  }
}
