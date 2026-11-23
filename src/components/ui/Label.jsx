import "@/components/ui/Label.css";

/* 폼 라벨. icon(lucide 컴포넌트)을 주면 왼쪽에 표시. htmlFor 가 없으면 <p> 로 렌더링 */
export default function Label({ icon: Icon, htmlFor, className = "", children, ...rest }) {
  const Tag = htmlFor ? "label" : "p";
  return (
    <Tag className={`ui-label ${className}`.trim()} htmlFor={htmlFor} {...rest}>
      {Icon && <Icon size={14} />}
      {children}
    </Tag>
  );
}
