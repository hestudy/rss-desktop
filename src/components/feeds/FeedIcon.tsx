import { useState } from 'react'

interface FeedIconProps {
  iconUrl?: string
  title: string
  size?: number
}

function isValidImageUrl(url: string): boolean {
  try {
    const parsed = new URL(url)
    return parsed.protocol === 'http:' || parsed.protocol === 'https:'
  } catch {
    return false
  }
}

export function FeedIcon({ iconUrl, title, size = 20 }: FeedIconProps) {
  const [imageError, setImageError] = useState(false)

  const initial = (title?.trim().charAt(0) || '?').toUpperCase()

  if (iconUrl && isValidImageUrl(iconUrl) && !imageError) {
    return (
      <img
        src={iconUrl}
        alt={title}
        className="rounded flex-shrink-0"
        style={{ width: size, height: size }}
        onError={() => setImageError(true)}
      />
    )
  }

  return (
    <div
      className="rounded flex-shrink-0 bg-sidebar-active text-white flex items-center justify-center font-medium"
      style={{ width: size, height: size, fontSize: size * 0.5 }}
    >
      {initial}
    </div>
  )
}
