"use client";

import React, { useState, useEffect } from "react";

type ProductCoverProps = {
  title: string;
  coverImage?: string | null;
  productType?: string;
  className?: string;
  aspectRatio?: string;
};

function isYouTubeOrWidescreen(url?: string | null, type?: string): boolean {
  if (!url || !url.trim()) return false;
  const u = url.toLowerCase();
  if (
    u.includes("ytimg.com") ||
    u.includes("youtube.com") ||
    u.includes("youtu.be") ||
    u.includes("hqdefault") ||
    u.includes("maxresdefault") ||
    u.includes("sddefault") ||
    u.includes("mqdefault") ||
    type === "COURSE"
  ) {
    return true;
  }
  return false;
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

  // Initial detection from URL & type to prevent layout shifts
  const initialIsWide = isYouTubeOrWidescreen(rawImage, productType);
  const [isWidescreen, setIsWidescreen] = useState<boolean>(initialIsWide);

  useEffect(() => {
    setIsWidescreen(isYouTubeOrWidescreen(rawImage, productType));
    setImgError(false);
  }, [rawImage, productType]);

  // Inspect actual image dimensions once loaded
  function handleImageLoad(e: React.SyntheticEvent<HTMLImageElement>) {
    const { naturalWidth, naturalHeight } = e.currentTarget;
    if (naturalWidth && naturalHeight) {
      const ratio = naturalWidth / naturalHeight;
      // Widescreen / YouTube thumbnail format (16:9 is 1.777, 4:3 is 1.333)
      setIsWidescreen(ratio >= 1.25);
    }
  }

  // Aspect ratio resolution:
  // 1. If no image: always square (aspect-square) with platform logo
  // 2. If custom aspectRatio provided (other than auto/aspect-square): use it
  // 3. Otherwise: aspect-video (16:9) if YouTube/widescreen, aspect-square if square image
  let finalAspectClass = "aspect-square";
  if (hasImage) {
    if (aspectRatio && aspectRatio !== "auto" && aspectRatio !== "aspect-square") {
      finalAspectClass = aspectRatio;
    } else {
      finalAspectClass = isWidescreen ? "aspect-video" : "aspect-square";
    }
  } else {
    finalAspectClass = "aspect-square";
  }

  return (
    <div
      className={`relative flex items-center justify-center overflow-hidden bg-slate-950 ${finalAspectClass} ${className} group`}
    >
      {hasImage ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={rawImage!}
          alt={title}
          loading="lazy"
          onLoad={handleImageLoad}
          onError={() => setImgError(true)}
          className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
        />
      ) : (
        // Square Nexora Logo Fallback
        <div className="relative flex h-full w-full items-center justify-center bg-black p-4 select-none">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/logo.png"
            alt={title || "Nexora"}
            className="h-full w-full object-contain drop-shadow-md transition duration-300 group-hover:scale-105"
          />
        </div>
      )}
    </div>
  );
}
