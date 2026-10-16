import { useEffect, useRef } from 'react';

export function BlobImage({
  blob,
  alt,
  className = '',
}: {
  blob: Blob;
  alt: string;
  className?: string;
}) {
  const imageRef = useRef<HTMLImageElement>(null);
  useEffect(() => {
    const element = imageRef.current;
    if (!element) return;
    const url = URL.createObjectURL(blob);
    element.src = url;
    return () => {
      element.removeAttribute('src');
      URL.revokeObjectURL(url);
    };
  }, [blob]);
  return <img ref={imageRef} alt={alt} className={`screenshot ${className}`} />;
}
