import Modal from "./Modal";
import Button from "./Button";

/**
 * 확인/취소 팝업 (Modal center + alertdialog)
 * @prop title / description / children  본문 (children은 description 아래에 추가 표시)
 * @prop confirmText / cancelText        버튼 문구 (기본 "확인" / "취소")
 * @prop hideCancel                      true면 확인 버튼만 (알림용)
 * @prop tone                            "default" | "danger" (확인 버튼 색)
 * @prop loading                         확인 버튼 로딩 표시
 * @prop closeOnConfirm                  확인 후 자동으로 onClose 호출 (기본 true)
 * @prop onConfirm / onCancel / onClose
 * 확인 버튼에는 연타 방지(600ms)가 적용되어 onConfirm이 한 번만 호출됩니다.
 */
export default function Popup({
  open, onClose, title, description, children, confirmText = "확인", cancelText = "취소",
  hideCancel = false, tone = "default", loading = false, closeOnConfirm = true, closeOnBackdrop = false,
  onConfirm, onCancel,
}) {
  const cancel = () => { onCancel?.(); onClose?.(); };
  const confirm = () => { onConfirm?.(); if (closeOnConfirm) onClose?.(); };

  return (
    <Modal
      open={open} onClose={cancel} variant="center" role="alertdialog" title={title}
      showClose={false} closeOnBackdrop={closeOnBackdrop}
      footer={
        <div className="flex gap-2">
          {!hideCancel && <Button variant="secondary" className="flex-1" onClick={cancel}>{cancelText}</Button>}
          <Button variant={tone === "danger" ? "destructive" : "primary"} className="flex-1" loading={loading} debounceMs={600} onClick={confirm}>{confirmText}</Button>
        </div>
      }
    >
      {description && <p className="text-sm leading-relaxed text-neutral-600">{description}</p>}
      {children}
    </Modal>
  );
}
