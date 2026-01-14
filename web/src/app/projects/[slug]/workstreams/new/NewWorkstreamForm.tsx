"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { PixelCard, PixelCardContent } from "@/components/pixel/PixelCard"
import { PixelButton } from "@/components/pixel/PixelButton"
import { PixelInput } from "@/components/pixel/PixelInput"
import { PixelTextarea } from "@/components/pixel/PixelTextarea"

interface NewWorkstreamFormProps {
  projectSlug: string
  projectName: string
}

export function NewWorkstreamForm({ projectSlug, projectName }: NewWorkstreamFormProps) {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [name, setName] = useState("")
  const [prompt, setPrompt] = useState("")
  const [maxIterations, setMaxIterations] = useState("20")

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setIsLoading(true)

    try {
      const response = await fetch(`/api/projects/${projectSlug}/workstreams`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name,
          prompt,
          maxIterations: parseInt(maxIterations, 10) || 20,
        }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || "Failed to create workstream")
      }

      const data = await response.json()
      router.push(`/projects/${projectSlug}/workstreams/${data.workstream.slug}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong")
    } finally {
      setIsLoading(false)
    }
  }

  // Generate preview slug
  const previewSlug = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")

  return (
    <PixelCard variant="elevated">
      <PixelCardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Project context */}
          <div className="pb-4 border-b-pixel border-simpson-brown">
            <p className="font-pixel text-[8px] text-simpson-white/60">
              CREATING WORKSTREAM FOR
            </p>
            <p className="font-pixel text-simpson-yellow text-xs mt-1">
              {projectName}
            </p>
          </div>

          {/* Name field */}
          <PixelInput
            label="WORKSTREAM NAME"
            placeholder="e.g., add-user-auth"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            disabled={isLoading}
          />

          {/* Slug preview */}
          {previewSlug && (
            <div className="flex items-center gap-2">
              <span className="font-pixel text-[8px] text-simpson-white/60">
                BRANCH:
              </span>
              <code className="font-pixel-body text-sm text-simpson-blue">
                ralph/{previewSlug}
              </code>
            </div>
          )}

          {/* Max iterations */}
          <PixelInput
            label="MAX ITERATIONS"
            type="number"
            min="1"
            max="100"
            value={maxIterations}
            onChange={(e) => setMaxIterations(e.target.value)}
            disabled={isLoading}
          />

          {/* Prompt field */}
          <PixelTextarea
            label="PROMPT (OPTIONAL)"
            placeholder="Describe what this workstream should accomplish..."
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            rows={6}
            disabled={isLoading}
          />

          <p className="font-pixel text-[8px] text-simpson-white/40">
            The prompt will be saved when you start the workstream.
            You can edit it later from the workstream detail page.
          </p>

          {/* Error display */}
          {error && (
            <div className="p-3 bg-simpson-red/10 border-pixel border-simpson-red rounded-pixel">
              <p className="font-pixel text-[10px] text-simpson-red">
                {error}
              </p>
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center justify-between pt-4">
            <PixelButton
              type="button"
              variant="secondary"
              onClick={() => router.back()}
              disabled={isLoading}
            >
              CANCEL
            </PixelButton>
            <PixelButton
              type="submit"
              variant="success"
              disabled={isLoading || !name.trim()}
            >
              {isLoading ? "CREATING..." : "CREATE WORKSTREAM"}
            </PixelButton>
          </div>
        </form>
      </PixelCardContent>
    </PixelCard>
  )
}
