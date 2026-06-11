import React, { useEffect, useState, useMemo, useRef } from 'react'
import { Film, Image } from 'lucide-react'
import { getOptimizedImageUrl } from '../../utils/supabaseImage'

interface ImageWithFallbackProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  fallbackType?: 'image' | 'video'
  fallbackSrc?: string
  /** Desired display width in CSS px — used to request right-sized image */
  displayWidth?: number
  /** Desired display height in CSS px */
  displayHeight?: number
  /** Image quality 1-100, default 75 */
  quality?: number
  /** Resize mode for Supabase transforms */
  resize?: 'cover' | 'contain' | 'fill'
  /** Skip Supabase image optimization */
  skipOptimize?: boolean
  /** Object-fit class for the rendered image; defaults to object-cover */
  imageClassName?: string
}

export function ImageWithFallback(props: ImageWithFallbackProps) {
  const [didError, setDidError] = useState(false)
  const [isLoading, setIsLoading] = useState(true)

  const handleError: React.ReactEventHandler<HTMLImageElement> = (e) => {
    props.onError?.(e)
    setDidError(true)
    setIsLoading(false)
  }

  const handleLoad: React.ReactEventHandler<HTMLImageElement> = (e) => {
    props.onLoad?.(e)
    setIsLoading(false)
  }

  const {
    src,
    alt,
    style,
    className,
    fallbackType = 'image',
    fallbackSrc,
    displayWidth,
    displayHeight,
    quality,
    resize,
    skipOptimize,
    imageClassName,
    ...rest
  } = props

  const hasSrc = !!src && String(src).trim() !== '' && String(src) !== 'null'
  const showFallback = !hasSrc || didError

  // Optimized URL: serve right-sized WebP from Supabase transforms
  const optimizedSrc = useMemo(() => {
    if (!hasSrc || skipOptimize) return src
    return getOptimizedImageUrl(src, {
      width: displayWidth,
      height: displayHeight,
      quality,
      resize,
    })
  }, [src, displayWidth, displayHeight, quality, resize, hasSrc, skipOptimize])

  // Tiny blur placeholder (20px wide, very low quality) for instant visual feedback
  const blurSrc = useMemo(() => {
    if (!hasSrc || skipOptimize) return undefined
    return getOptimizedImageUrl(src, { width: 20, quality: 20 })
  }, [src, hasSrc, skipOptimize])
  const imageSrc = String(optimizedSrc || '')
  const previousImageSrcRef = useRef<string | null>(null)
  const imageRef = useRef<HTMLImageElement | null>(null)

  useEffect(() => {
    if (previousImageSrcRef.current === null) {
      previousImageSrcRef.current = imageSrc || null
      return
    }
    if (previousImageSrcRef.current === imageSrc) return
    previousImageSrcRef.current = imageSrc || null
    setDidError(false)
    setIsLoading(true)
  }, [imageSrc])

  useEffect(() => {
    const image = imageRef.current
    if (image?.complete && image.naturalWidth > 0) {
      setDidError(false)
      setIsLoading(false)
    }
  }, [imageSrc])

  return (
    <>
      {showFallback ? (
        <div
          className={`inline-block bg-muted text-center align-middle overflow-hidden ${className ?? ''}`}
          style={style}
        >
          <div className="flex items-center justify-center w-full h-full text-muted-foreground">
            {fallbackSrc ? (
              <img
                src={fallbackSrc}
                alt="Error loading image"
                {...rest}
                className={className}
                loading="lazy"
                decoding="async"
              />
            ) : fallbackType === 'video' ? (
              <Film className="w-8 h-8 opacity-50" />
            ) : (
              <Image className="w-8 h-8 opacity-50" />
            )}
          </div>
        </div>
      ) : (
        <div className={`relative overflow-hidden ${className ?? ''}`} style={style}>
          {/* Blur placeholder — shown instantly while full image loads */}
          {isLoading && blurSrc && (
            <img
              src={blurSrc}
              alt=""
              aria-hidden
              className="absolute inset-0 w-full h-full object-cover blur-lg scale-110"
              style={{ filter: 'blur(16px)', transform: 'scale(1.1)' }}
            />
          )}
          <img
            ref={imageRef}
            key={imageSrc}
            src={imageSrc}
            alt={alt}
            className={`w-full h-full ${imageClassName ?? 'object-cover'} ${isLoading ? 'opacity-0' : 'opacity-100'} transition-opacity duration-300`}
            loading="lazy"
            decoding="async"
            {...rest}
            onError={handleError}
            onLoad={handleLoad}
          />
        </div>
      )}
    </>
  )
}
