// className 합치기 (falsy 값 제거). tailwind-merge를 쓴다면: export const cn = (...a) => twMerge(clsx(a));
export const cn = (...args) => args.flat(Infinity).filter(Boolean).join(" ");
