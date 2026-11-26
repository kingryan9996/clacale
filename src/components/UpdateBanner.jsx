import { useSyncExternalStore } from "react";
import { Button } from "@/components/ui";
import { PWA_TEXT } from "@/constants/pwa";
import { applyUpdate, pwaState } from "@/lib/pwa";
import "./UpdateBanner.css";

/* 새 버전 알림 배너. 모달이 아니라 탭바 위에 붙는 띠 → 화면을 막지 않음 */
export default function UpdateBanner() {
  const state = useSyncExternalStore(pwaState.subscribe, pwaState.getSnapshot, () => "none");
  if (state === "none") return null;
  return (
    <div className="update-banner" role="status">
      <span className="update-banner__text">{PWA_TEXT.update}</span>
      <Button size="sm" onClick={applyUpdate} disabled={state === "applying"}>
        {state === "applying" ? PWA_TEXT.updating : PWA_TEXT.updateBtn}
      </Button>
    </div>
  );
}
