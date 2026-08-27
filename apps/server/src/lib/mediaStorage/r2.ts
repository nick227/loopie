import { HeadObjectCommand, PutObjectCommand, S3Client } from '@aws-sdk/client-s3'

export type R2Config = {
  endpoint: string
  accessKeyId: string
  secretAccessKey: string
  bucket: string
  publicUrl: string
}

export function readR2Config(env: NodeJS.ProcessEnv = process.env): R2Config | null {
  const accessKeyId = env.R2_ACCESS_KEY_ID
  const secretAccessKey = env.R2_SECRET_ACCESS_KEY
  const bucket = env.R2_BUCKET
  const publicUrl = env.R2_PUBLIC_URL?.replace(/\/$/, '')
  const endpoint =
    env.R2_ENDPOINT?.replace(/\/$/, '') ||
    (env.R2_ACCOUNT_ID ? `https://${env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com` : undefined)
  if (!accessKeyId || !secretAccessKey || !bucket || !publicUrl || !endpoint) return null
  return { endpoint, accessKeyId, secretAccessKey, bucket, publicUrl }
}

function client(cfg: R2Config) {
  return new S3Client({
    region: 'auto',
    endpoint: cfg.endpoint,
    credentials: {
      accessKeyId: cfg.accessKeyId,
      secretAccessKey: cfg.secretAccessKey,
    },
  })
}

function isNotFound(err: unknown) {
  if (!err || typeof err !== 'object') return false
  const name = 'name' in err ? String(err.name) : ''
  const meta = err as { $metadata?: { httpStatusCode?: number } }
  return name === 'NotFound' || name === 'NoSuchKey' || meta.$metadata?.httpStatusCode === 404
}

export function r2PublicUrl(key: string, env: NodeJS.ProcessEnv = process.env) {
  const cfg = readR2Config(env)
  if (!cfg) throw new Error('R2 is not configured')
  return `${cfg.publicUrl}/${key}`
}

export async function r2Put(
  key: string,
  buffer: Buffer,
  mimeType: string,
  env: NodeJS.ProcessEnv = process.env,
) {
  const cfg = readR2Config(env)
  if (!cfg) throw new Error('R2 is not configured')
  await client(cfg).send(
    new PutObjectCommand({
      Bucket: cfg.bucket,
      Key: key,
      Body: buffer,
      ContentType: mimeType,
    }),
  )
}

export async function r2ObjectExists(key: string, env: NodeJS.ProcessEnv = process.env) {
  const cfg = readR2Config(env)
  if (!cfg) throw new Error('R2 is not configured')
  try {
    await client(cfg).send(new HeadObjectCommand({ Bucket: cfg.bucket, Key: key }))
    return true
  } catch (err) {
    if (isNotFound(err)) return false
    throw err
  }
}
