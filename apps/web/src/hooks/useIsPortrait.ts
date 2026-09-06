import { useEffect, useState } from 'react'

export function useIsPortrait(url: string | undefined) {
  const [portrait, setPortrait] = useState(false)
  useEffect(() => {
    if (!url) return
    const img = new Image()
    img.onload = () => setPortrait(img.naturalHeight > img.naturalWidth)
    img.src = url
  }, [url])
  return portrait
}
