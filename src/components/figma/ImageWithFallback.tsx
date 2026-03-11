import React, { useState } from 'react'
import { Film } from 'lucide-react'

const ERROR_IMG_SRC = 'https://placehold.co/600x600/f3f4f6/9ca3af?text=No+Image'

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

  const handleError = () => {
    setDidError(true)
    setIsLoading(false)
  }

  const handleLoad = () => {
    setIsLoading(false)
  }

  const { src, alt, style, className, fallbackType = 'image', fallbackSrc, ...rest } = props

  return (
    <>
      {didError ? (
        <div
          className={`inline-block bg-gray-100 text-center align-middle ${className ?? ''}`}
          style={style}
        >
          <div className="flex items-center justify-center w-full h-full text-gray-400">
            {fallbackType === 'video' ? (
              <Film className="w-8 h-8 opacity-50" />
            ) : (
              <img 
                src={fallbackSrc || ERROR_IMG_SRC} 
                alt="Error loading image" 
                {...rest} 
                className={fallbackSrc ? className : undefined} 
                data-original-url={src} 
              />
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
