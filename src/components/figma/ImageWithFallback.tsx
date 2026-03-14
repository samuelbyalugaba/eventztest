import React, { useState } from 'react'
import { Film, Image } from 'lucide-react'

interface ImageWithFallbackProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  fallbackType?: 'image' | 'video'
  fallbackSrc?: string
  width?: number
  height?: number
  quality?: number
  resize?: 'cover' | 'contain' | 'fill'
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

  const { src, alt, style, className, fallbackType = 'image', fallbackSrc, ...rest } = props
  const hasSrc = !!src && String(src).trim() !== '' && String(src) !== 'null'
  const showFallback = !hasSrc || didError

  return (
    <>
      {showFallback ? (
        <div
          className={`inline-block bg-gray-100 text-center align-middle ${className ?? ''}`}
          style={style}
        >
          <div className="flex items-center justify-center w-full h-full text-gray-400">
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
        <img 
          src={src} 
          alt={alt} 
          className={`${className} ${isLoading ? 'opacity-0' : 'opacity-100'} transition-opacity duration-300`} 
          style={style} 
          loading="lazy"
          decoding="async"
          {...rest} 
          onError={handleError} 
          onLoad={handleLoad}
        />
      )}
    </>
  )
}
