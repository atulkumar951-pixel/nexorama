import React from "react";

type ProductCoverProps = {
  title: string;
  coverImage?: string | null;
  productType?: string;
  className?: string;
  aspectRatio?: string;
};

export default function ProductCover({
  title,
  coverImage,
  productType,
  className = "",
  aspectRatio = "aspect-square",
}: ProductCoverProps) {
  const hasImage = Boolean(coverImage && coverImage.trim() !== "");

  return (
    <div
      className={`relative flex items-center justify-center overflow-hidden bg-slate-950 ${aspectRatio} ${className} group`}
    >
      {hasImage ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={coverImage!}
          alt={title}
          loading="lazy"
          className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
        />
      ) : (
        // Square Nexora Logo Fallback
        <div className="relative flex h-full w-full items-center justify-center bg-black p-3 select-none">
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
