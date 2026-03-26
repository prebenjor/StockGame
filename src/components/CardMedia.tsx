import { useState } from 'react'

type Props = {
  imageUrl?: string
  imageAlt?: string
  fallbackLabel?: string
  size?: 'default' | 'compact'
}

export function CardMedia({ imageUrl, imageAlt, fallbackLabel = 'Image unavailable', size = 'default' }: Props) {
  const [failed, setFailed] = useState(false)
  const mediaClassName = `card-media${size === 'compact' ? ' compact' : ''}`

  if (!imageUrl || failed) {
    return (
      <div className={`${mediaClassName} media-fallback`} role="img" aria-label={imageAlt ?? fallbackLabel}>
        <span>{fallbackLabel}</span>
      </div>
    )
  }

  return (
    <div className={mediaClassName}>
      <img
        src={imageUrl}
        alt={imageAlt ?? ''}
        loading="lazy"
        referrerPolicy="no-referrer"
        onError={() => setFailed(true)}
      />
    </div>
  )
}
