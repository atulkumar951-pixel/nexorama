export function formatINR(amount: number) {
  return `₹${amount.toLocaleString("en-IN")}`;
}

export function formatBytes(bytes: number) {
  if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  if (bytes >= 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${bytes} B`;
}

export function formatDate(d: Date | string | null | undefined) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

export function statusBadgeClass(status: string) {
  switch (status) {
    case "PAID":
    case "COMPLETED":
    case "CAPTURED":
    case "ACTIVE":
    case "PUBLISHED":
    case "AVAILABLE":
    case "SENT":
      return "bg-emerald-100 text-emerald-700";
    case "PENDING":
    case "CREATED":
    case "DRAFT":
      return "bg-amber-100 text-amber-700";
    case "RESERVED":
      return "bg-violet-100 text-violet-700";
    case "ASSIGNED":
    case "PROCESSING":
      return "bg-blue-100 text-blue-700";
    case "MANUAL_REVIEW":
      return "bg-orange-100 text-orange-700";
    case "FAILED":
    case "CANCELLED":
    case "REVOKED":
    case "BANNED":
    case "SUSPENDED":
      return "bg-red-100 text-red-700";
    case "REFUNDED":
    case "PARTIALLY_REFUNDED":
    case "EXPIRED":
    case "UNPUBLISHED":
    case "ARCHIVED":
    case "REPLACED":
      return "bg-slate-200 text-slate-600";
    default:
      return "bg-indigo-100 text-indigo-700";
  }
}
