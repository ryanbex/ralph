import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_-]+/g, "-")
    .replace(/^-+|-+$/g, "")
}

export function isValidGithubRepoUrl(url: string): boolean {
  const pattern = /^https:\/\/github\.com\/[\w.-]+\/[\w.-]+\/?$/
  return pattern.test(url)
}

export function extractGithubRepoName(url: string): string | null {
  const match = url.match(/github\.com\/[\w.-]+\/([\w.-]+)\/?$/)
  return match ? match[1].replace(/\.git$/, "") : null
}
