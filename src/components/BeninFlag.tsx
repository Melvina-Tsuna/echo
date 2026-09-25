export default function BeninFlag({ className = "w-6 h-4" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 3 2"
      className={`${className} rounded-[2px] shrink-0`}
      aria-hidden="true"
    >
      <rect width="3" height="2" fill="#E8112D" />
      <rect width="1.2" height="2" fill="#008751" />
      <rect x="1.2" width="1.8" height="1" fill="#FCD116" />
    </svg>
  );
}
