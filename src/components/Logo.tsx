/** Atlas mark: three nested contour lines around a summit, read like a topographic map. */
export function LogoMark({ size = 24, title }: { size?: number; title?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      role={title ? 'img' : undefined}
      aria-label={title}
      aria-hidden={title ? undefined : true}
      className="logo-mark"
    >
      <path
        d="M12 2.8c4.6 0 8.6 2.9 9 7.4.4 4.8-3 9.6-8.3 10.9C7.4 22.4 2.8 19 2.6 13.7 2.4 7.8 6.6 2.8 12 2.8Z"
        fill="none"
        stroke="var(--accent)"
        strokeOpacity="0.45"
        strokeWidth="1.4"
      />
      <path
        d="M12.6 6.6c2.9.1 5.1 2 5.2 4.8.1 3.1-2.2 5.8-5.4 6.1-3 .3-5.4-1.7-5.5-4.6C6.8 9.6 9.3 6.5 12.6 6.6Z"
        fill="none"
        stroke="var(--accent)"
        strokeOpacity="0.8"
        strokeWidth="1.4"
      />
      <path d="M13 10.1c1.3 0 2.3.9 2.3 2.2 0 1.4-1.1 2.5-2.5 2.5-1.3 0-2.2-.9-2.2-2.1 0-1.4 1-2.6 2.4-2.6Z" fill="var(--accent)" />
    </svg>
  );
}
