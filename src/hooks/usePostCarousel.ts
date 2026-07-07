import { useState, useCallback, useEffect } from 'react';
import { type CarouselApi } from '../components/ui/carousel';

export function usePostCarousel() {
  const [api, setApi] = useState<CarouselApi>();
  const [carouselIndex, setCarouselIndex] = useState(0);
  const [carouselHeight, setCarouselHeight] = useState<number | null>(null);

  const updateCarouselHeight = useCallback(() => {
    if (!api) return;
    const slide = api.slideNodes()[0] as HTMLElement | undefined;
    const frame = slide?.querySelector('[data-media-frame="true"]') as HTMLElement | null;
    if (!frame) return;
    const next = Math.ceil(frame.getBoundingClientRect().height);
    if (next > 0) setCarouselHeight((prev) => (prev === next ? prev : next));
  }, [api]);

  useEffect(() => {
    if (!api) return;

    const onSelect = () => {
      setCarouselIndex(api.selectedScrollSnap());
    };

    api.on('select', onSelect);

    const onSize = () => {
      requestAnimationFrame(updateCarouselHeight);
    };
    onSize();
    api.on('reInit', onSize);

    return () => {
      api.off('select', onSelect);
      api.off('reInit', onSize);
    };
  }, [api, updateCarouselHeight]);

  return {
    api,
    setApi,
    carouselIndex,
    carouselHeight,
    updateCarouselHeight,
  };
}
