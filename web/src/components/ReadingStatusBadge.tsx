import { Ban, BookMarked, BookOpen, CircleCheck, PauseCircle } from "lucide-react";
import type { ReadingStatus } from "../types";
import { useI18n } from "../i18n";

export function ReadingStatusBadge({ status, compact = false }: { status?: ReadingStatus; compact?: boolean }) {
  const { t } = useI18n();
  if (!status) return null;
  const content = {
    want_to_read:[BookMarked,t("wantToRead")], reading:[BookOpen,t("reading")], read:[CircleCheck,t("read")],
    dnf:[Ban,t("dnf")], dnf_for_now:[PauseCircle,t("dnfForNow")],
  } as const;
  const [Icon,label] = content[status];
  return <span className={`status-badge status-${status} ${compact ? "compact" : ""}`} title={label}><Icon />{!compact && <span>{label}</span>}</span>;
}
