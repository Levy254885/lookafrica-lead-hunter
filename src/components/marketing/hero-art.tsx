/** Original flower and vine illustration for the hero (drawn here, not copied from anywhere). */
function Flower({ x, y, r, petals, fill, centre, rot = 0 }: { x: number; y: number; r: number; petals: number; fill: string; centre: string; rot?: number }) {
  return (
    <g transform={`translate(${x} ${y}) rotate(${rot})`}>
      {Array.from({ length: petals }, (_, i) => (
        <ellipse key={i} cx="0" cy={-r * 0.62} rx={r * 0.34} ry={r * 0.52} fill={fill} transform={`rotate(${(360 / petals) * i})`} />
      ))}
      <circle r={r * 0.3} fill={centre} />
    </g>
  );
}

export function FlowersLeft({ className = '' }: { className?: string }) {
  return (
    <svg viewBox="0 0 260 300" className={className} aria-hidden="true">
      <path d="M10 292 C70 250 40 200 100 170 C150 145 130 100 150 70" fill="none" stroke="#1f5f3a" strokeWidth="7" strokeLinecap="round" />
      <path d="M40 276 C20 240 70 232 60 196" fill="none" stroke="#2f7d4a" strokeWidth="5" strokeLinecap="round" />
      <ellipse cx="86" cy="206" rx="16" ry="7" fill="#2f7d4a" transform="rotate(-30 86 206)" />
      <ellipse cx="118" cy="150" rx="15" ry="6" fill="#1f5f3a" transform="rotate(25 118 150)" />
      <Flower x={150} y={62} r={34} petals={7} fill="#f2a6c8" centre="#f7d46a" rot={10} />
      <Flower x={62} y={168} r={36} petals={9} fill="#ef7f4a" centre="#7a2e12" />
      <Flower x={60} y={190} r={20} petals={8} fill="#b9d34a" centre="#4a5a12" rot={20} />
      <Flower x={196} y={150} r={22} petals={6} fill="#f5b942" centre="#a2551a" rot={15} />
    </svg>
  );
}

export function FlowersRight({ className = '' }: { className?: string }) {
  return (
    <svg viewBox="0 0 220 300" className={className} aria-hidden="true">
      <path d="M215 292 C150 250 180 200 130 165 C95 140 120 100 100 70" fill="none" stroke="#1f5f3a" strokeWidth="7" strokeLinecap="round" />
      <ellipse cx="150" cy="200" rx="16" ry="7" fill="#2f7d4a" transform="rotate(30 150 200)" />
      <ellipse cx="118" cy="140" rx="15" ry="6" fill="#1f5f3a" transform="rotate(-25 118 140)" />
      <Flower x={100} y={58} r={34} petals={8} fill="#b79bf0" centre="#f7d46a" rot={5} />
      <Flower x={150} y={140} r={30} petals={7} fill="#4a8fe0" centre="#f7d46a" rot={20} />
      <Flower x={56} y={120} r={20} petals={6} fill="#ef6a6a" centre="#7a1d1d" />
    </svg>
  );
}
