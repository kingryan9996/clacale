import { X } from "lucide-react";
import Button from "@/components/ui/Button";
import Sheet, { SheetBody, SheetHeader } from "@/components/ui/Sheet";

/* 확인/선택 팝업도 공통 Sheet(size="auto": 내용 높이)로 띄운다. actions 는 close 를 받아 하단 버튼들을 돌려주는 함수 */
export default function ConfirmSheet({ title, label, role = "alertdialog", onClose, children, actions }) {
  return (
    <Sheet role={role} label={label ?? title} size="auto" onClose={onClose}>
      {(close) => (
        <>
          <SheetHeader left={<Button variant="ghost" size="icon" onClick={close} aria-label="닫기"><X size={22} /></Button>} title={title} />
          <SheetBody gap={12}>{children}</SheetBody>
          <div className="ui-sheet__footer">{actions(close)}</div>
        </>
      )}
    </Sheet>
  );
}
