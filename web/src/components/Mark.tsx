/**
 * The LightBluePrep mark: a filled answer bubble with a tick, on a light blue
 * tile. Inline so it costs no request and cannot flash in after the nav paints.
 *
 * Keep the geometry in step with public/favicon.svg; they are the same mark.
 */
export function Mark({ size = 26 }: { size?: number }) {
  return (
    <svg className="mark" width={size} height={size} viewBox="0 0 48 48"
         fill="none" aria-hidden="true" focusable="false">
      <rect x="3" y="3" width="42" height="42" rx="11" fill="#3aa3ec" />
      <circle cx="24" cy="24" r="12.5" fill="#ffffff" />
      <path d="M18.2 24.4l4 4 7.6-8.2" stroke="#1479c2" strokeWidth="3.4"
            strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}
