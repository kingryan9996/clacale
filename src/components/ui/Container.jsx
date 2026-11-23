import "@/components/ui/Container.css";

/* 모바일 폭 컨테이너. height: "screen"(100dvh) | "fill"(부모 100%) | undefined(auto) */
export default function Container({ as: Tag = "div", height, padded = false, center = false, className = "", children, ...rest }) {
  return (
    <Tag className={`ui-container ${className}`.trim()} data-height={height} data-padded={padded || undefined} data-center={center || undefined} {...rest}>
      {children}
    </Tag>
  );
}
