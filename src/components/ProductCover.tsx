"use client";

import React, { useState, useEffect, useRef } from "react";

type ProductCoverProps = {
  title: string;
  coverImage?: string | null;
  productType?: string;
  className?: string;
  aspectRatio?: string;
};

// Check if image URL matches known YouTube thumbnail patterns (which are always 16:9 widescreen)
function isYouTubeThumbnail(url?: string | null): boolean {
  if (!url || !url.trim()) return false;
  const u = url.toLowerCase();
  return (
    u.includes("ytimg.com") ||
    u.includes("youtube.com") ||
    u.includes("youtu.be") ||
    u.includes("hqdefault") ||
    u.includes("maxresdefault") ||
    u.includes("sddefault") ||
    u.includes("mqdefault") ||
    u.includes("hq720")
  );
}

export default function ProductCover({
  title,
  coverImage,
  productType,
  className = "",
  aspectRatio,
}: ProductCoverProps) {
  const [imgError, setImgError] = useState(false);
  const rawImage = coverImage && coverImage.trim() !== "" ? coverImage.trim() : null;
  const hasImage = Boolean(rawImage && !imgError);

  // Synchronous initial detection from URL
  const [isWidescreen, setIsWidescreen] = useState<boolean>(() => isYouTubeThumbnail(rawImage));

  const imgRef = useRef<HTMLImageElement>(null);

  useEffect(() => {
    setImgError(false);

    if (!rawImage) {
      setIsWidescreen(false);
      return;
    }

    // Fast path: YouTube thumbnails are always 16:9 widescreen
    if (isYouTubeThumbnail(rawImage)) {
      setIsWidescreen(true);
    }

    let isMounted = true;

    // Probe in-memory Image to reliably measure natural dimensions even when cached
    const probe = new Image();
    probe.src = rawImage;

    const measure = (width: number, height: number) => {
      if (!isMounted || !width || !height) return;
      const ratio = width / height;
      // Widescreen format (16:9 is ~1.78, 4:3 is ~1.33) vs square (1:1)
      setIsWidescreen(ratio >= 1.25);
    };

    if (probe.complete && probe.naturalWidth > 0) {
      measure(probe.naturalWidth, probe.naturalHeight);
    } else {
      probe.onload = () => measure(probe.naturalWidth, probe.naturalHeight);
      probe.onerror = () => {
        if (isMounted) setImgError(true);
      };
    }

    // Also check DOM ref in case it completed synchronously
    if (imgRef.current && imgRef.current.complete && imgRef.current.naturalWidth > 0) {
      measure(imgRef.current.naturalWidth, imgRef.current.naturalHeight);
    }

    return () => {
      isMounted = false;
    };
  }, [rawImage, productType]);

  // Inspect actual image dimensions once loaded in DOM
  function handleImageLoad(e: React.SyntheticEvent<HTMLImageElement>) {
    const { naturalWidth, naturalHeight } = e.currentTarget;
    if (naturalWidth && naturalHeight) {
      const ratio = naturalWidth / naturalHeight;
      setIsWidescreen(ratio >= 1.25);
    }
  }

  // Determine aspect ratio class and container sizing:
  // 1. If custom aspectRatio provided: use it
  // 2. If YouTube thumbnail / widescreen: aspect-video (16:9)
  // 3. If square or portrait image: aspect-square (1:1)
  // 4. If no image: aspect-square (1:1) with platform logo
  let finalAspectClass = "aspect-square";
  let maxWClass = "max-w-md";

  if (hasImage) {
    if (aspectRatio && aspectRatio !== "auto" && aspectRatio !== "aspect-square") {
      finalAspectClass = aspectRatio;
      maxWClass = "max-w-2xl";
    } else {
      finalAspectClass = isWidescreen ? "aspect-video" : "aspect-square";
      maxWClass = isWidescreen ? "max-w-2xl" : "max-w-md";
    }
  } else {
    finalAspectClass = "aspect-square";
    maxWClass = "max-w-xs sm:max-w-sm";
  }

  return (
    <div
      key={rawImage ?? "fallback-logo"}
      className={`relative flex items-center justify-center overflow-hidden bg-slate-950 ${finalAspectClass} ${maxWClass} w-full ${className} group`}
    >
      {hasImage ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          ref={imgRef}
          src={rawImage!}
          alt={title}
          loading="eager"
          decoding="async"
          onLoad={handleImageLoad}
          onError={() => setImgError(true)}
          className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
        />
      ) : (
        // Square Nexora Logo Fallback
        <div className="relative flex h-full w-full items-center justify-center bg-black p-6 select-none">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/logo.png"
            alt={title || "Nexora"}
            className="h-full w-full max-h-40 max-w-40 object-contain drop-shadow-md transition duration-300 group-hover:scale-105"
          />
        </div>
      )}
    </div>
  );
}
