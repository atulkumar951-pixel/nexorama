import React from "react";

type ProductCoverProps = {
  title: string;
  coverImage?: string | null;
  productType?: string;
  className?: string;
  aspectRatio?: string;
};

const THEMES: Record<string, { bg: string; badgeBg: string; badgeText: string; icon: string; label: string }> = {
  PDF: {
    bg: "from-rose-900 via-rose-950 to-slate-950",
    badgeBg: "bg-rose-500/20 ring-rose-500/40 text-rose-200",
    badgeText: "PDF NOTES",
    icon: "📄",
    label: "PDF Document",
  },
  ZIP: {
    bg: "from-sky-900 via-indigo-950 to-slate-950",
    badgeBg: "bg-sky-500/20 ring-sky-500/40 text-sky-200",
    badgeText: "ZIP BUNDLE",
    icon: "🗜️",
    label: "ZIP Resource Pack",
  },
  COURSE: {
    bg: "from-purple-900 via-slate-950 to-black",
    badgeBg: "bg-purple-500/20 ring-purple-500/40 text-purple-200",
    badgeText: "VIDEO SERIES",
    icon: "🎬",
    label: "Lecture Series",
  },
  EBOOK: {
    bg: "from-emerald-900 via-teal-950 to-slate-950",
    badgeBg: "bg-emerald-500/20 ring-emerald-500/40 text-emerald-200",
    badgeText: "EBOOK",
    icon: "📖",
    label: "eBook Edition",
  },
  BUNDLE: {
    bg: "from-amber-900 via-orange-950 to-slate-950",
    badgeBg: "bg-amber-500/20 ring-amber-500/40 text-amber-200",
    badgeText: "MEGA BUNDLE",
    icon: "🎁",
    label: "All-in-One Pack",
  },
  DOCUMENT: {
    bg: "from-slate-800 via-slate-900 to-black",
    badgeBg: "bg-slate-500/20 ring-slate-400/40 text-slate-200",
    badgeText: "DOCS",
    icon: "📃",
    label: "Document",
  },
};

export default function ProductCover({
  title,
  coverImage,
  productType = "PDF",
  className = "",
  aspectRatio = "aspect-[16/10]",
}: ProductCoverProps) {
  const type = (productType || "PDF").toUpperCase();
  const theme = THEMES[type] ?? THEMES.PDF;

  if (coverImage && coverImage.trim() !== "") {
    return (
      <div className={`relative overflow-hidden bg-slate-900 ${aspectRatio} ${className}`}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={coverImage}
          alt={title}
          loading="lazy"
          className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
        />
      </div>
    );
  }

  return (
    <div
      className={`relative flex flex-col justify-between overflow-hidden bg-gradient-to-br ${theme.bg} p-5 text-white shadow-inner select-none ${aspectRatio} ${className}`}
    >
      {/* Ambient background decoration */}
      <div className="absolute -right-6 -top-6 h-32 w-32 rounded-full bg-emerald-500/10 blur-2xl" />
      <div className="absolute -bottom-6 -left-6 h-32 w-32 rounded-full bg-indigo-500/10 blur-2xl" />

      {/* Top row: Format badge & Nexora watermark */}
      <div className="relative z-10 flex items-center justify-between">
        <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider ring-1 backdrop-blur-md ${theme.badgeBg}`}>
          <span>{theme.icon}</span>
          <span>{theme.badgeText}</span>
        </span>
        <span className="text-[10px] font-extrabold uppercase tracking-widest text-emerald-400/80">
          NEXORA
        </span>
      </div>

      {/* Center / Bottom: Title snippet and clean graphic */}
      <div className="relative z-10 my-auto py-2">
        <div className="mb-1 text-2xl font-black">{theme.icon}</div>
        <h4 className="line-clamp-2 text-sm font-bold leading-tight text-slate-100 drop-shadow-sm">
          {title}
        </h4>
        <p className="mt-1 text-[11px] font-medium text-slate-400">{theme.label}</p>
      </div>

      {/* Subtle bottom stripe */}
      <div className="relative z-10 flex items-center justify-between border-t border-white/10 pt-2 text-[10px] text-slate-400">
        <span className="font-semibold text-emerald-400">⚡ Instant Access</span>
        <span>Digital Resource</span>
      </div>
    </div>
  );
}
