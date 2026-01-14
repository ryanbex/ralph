"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { PixelInput, PixelButton } from "@/components/pixel"

export function NewProjectForm() {
  const router = useRouter()
  const [name, setName] = useState("")
  const [githubRepoUrl, setGithubRepoUrl] = useState("")
  const [baseBranch, setBaseBranch] = useState("main")
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          githubRepoUrl: githubRepoUrl.trim(),
          baseBranch: baseBranch.trim() || "main",
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Failed to create project")
      }

      router.push(`/projects/${data.project.slug}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create project")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <PixelInput
        label="Project Name"
        placeholder="My Awesome Project"
        value={name}
        onChange={(e) => setName(e.target.value)}
        required
      />

      <PixelInput
        label="GitHub Repository URL"
        placeholder="https://github.com/username/repo"
        value={githubRepoUrl}
        onChange={(e) => setGithubRepoUrl(e.target.value)}
        required
      />

      <PixelInput
        label="Base Branch (optional)"
        placeholder="main"
        value={baseBranch}
        onChange={(e) => setBaseBranch(e.target.value)}
      />

      {error && (
        <div className="p-3 bg-simpson-red/20 border-pixel border-simpson-red rounded-pixel">
          <p className="font-pixel text-[10px] text-simpson-red">{error}</p>
        </div>
      )}

      <div className="flex gap-3">
        <PixelButton
          type="submit"
          variant="success"
          disabled={isLoading || !name.trim() || !githubRepoUrl.trim()}
        >
          {isLoading ? "CREATING..." : "CREATE PROJECT"}
        </PixelButton>
      </div>
    </form>
  )
}
