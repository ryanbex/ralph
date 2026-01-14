# Ralph Workstream: web-blob

## Objective
Implement Vercel Blob storage integration for storing PROMPT.md and PROGRESS.md files.

## Context
- Workstreams need to store prompt and progress markdown files
- Vercel Blob provides CDN-backed file storage
- Files will be referenced from workstream database records

## Scope
### Include
- Install @vercel/blob package
- Create `web/src/lib/blob.ts` with helper functions
- Upload prompt function (returns blob URL)
- Upload progress function (returns blob URL)
- Download/read blob content function
- Update .env.local.example with BLOB_READ_WRITE_TOKEN

### Exclude
- Integrating with workstream pages (separate workstream)
- Blob deletion/cleanup
- Large file handling

## Instructions
1. Read PROGRESS.md to see what's already done
2. Check existing lib files for patterns
3. Install @vercel/blob package
4. Create blob.ts with typed helper functions
5. Create upload functions for prompt and progress
6. Create read function to fetch blob content
7. Update env example file
8. Run type-check to verify
9. Update PROGRESS.md after each step
10. When complete, write "## Status: COMPLETE" in PROGRESS.md

## Technical Notes
```typescript
// Example blob.ts structure
import { put, del } from '@vercel/blob';

export async function uploadPrompt(workstreamId: string, content: string): Promise<string> {
  const blob = await put(`workstreams/${workstreamId}/PROMPT.md`, content, {
    access: 'public',
    contentType: 'text/markdown',
  });
  return blob.url;
}
```

- Blob URLs are permanent and publicly accessible
- Use workstreamId in path for organization
- For local dev without Vercel, functions should gracefully handle missing token

## Constraints
- Follow existing patterns in web/src/lib/
- Type all functions properly
- One logical change per iteration
- Always verify changes compile
