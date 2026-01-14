import { put, head } from '@vercel/blob'

export async function uploadPrompt(
  workstreamId: string,
  content: string
): Promise<string> {
  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    throw new Error('BLOB_READ_WRITE_TOKEN is not configured')
  }

  const blob = await put(`workstreams/${workstreamId}/PROMPT.md`, content, {
    access: 'public',
    contentType: 'text/markdown',
  })
  return blob.url
}

export async function uploadProgress(
  workstreamId: string,
  content: string
): Promise<string> {
  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    throw new Error('BLOB_READ_WRITE_TOKEN is not configured')
  }

  const blob = await put(`workstreams/${workstreamId}/PROGRESS.md`, content, {
    access: 'public',
    contentType: 'text/markdown',
  })
  return blob.url
}

export async function readBlob(url: string): Promise<string> {
  const response = await fetch(url)
  if (!response.ok) {
    throw new Error(`Failed to fetch blob: ${response.statusText}`)
  }
  return response.text()
}

export async function blobExists(url: string): Promise<boolean> {
  try {
    const metadata = await head(url)
    return metadata !== null
  } catch {
    return false
  }
}
