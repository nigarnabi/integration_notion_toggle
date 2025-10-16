export function IntegrationIcon() {
  return (
    <svg
      width="240"
      height="240"
      viewBox="0 0 240 240"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className="w-full h-full"
    >
      {/* Three connected rounded nodes forming an abstract integration pattern */}

      {/* Top node */}
      <circle
        cx="120"
        cy="60"
        r="32"
        fill="#9cb380"
        className="animate-pulse"
        style={{ animationDuration: "3s" }}
      />

      {/* Bottom left node */}
      <circle
        cx="70"
        cy="160"
        r="32"
        fill="#c59849"
        className="animate-pulse"
        style={{ animationDuration: "3s", animationDelay: "1s" }}
      />

      {/* Bottom right node */}
      <circle
        cx="170"
        cy="160"
        r="32"
        fill="#c73e1d"
        className="animate-pulse"
        style={{ animationDuration: "3s", animationDelay: "2s" }}
      />

      {/* Connection lines */}
      <line
        x1="120"
        y1="92"
        x2="85"
        y2="140"
        stroke="#522a27"
        strokeWidth="3"
        strokeLinecap="round"
        opacity="0.3"
      />
      <line
        x1="120"
        y1="92"
        x2="155"
        y2="140"
        stroke="#522a27"
        strokeWidth="3"
        strokeLinecap="round"
        opacity="0.3"
      />
      <line
        x1="102"
        y1="160"
        x2="138"
        y2="160"
        stroke="#522a27"
        strokeWidth="3"
        strokeLinecap="round"
        opacity="0.3"
      />

      {/* Inner circles for depth */}
      <circle cx="120" cy="60" r="16" fill="white" opacity="0.4" />
      <circle cx="70" cy="160" r="16" fill="white" opacity="0.4" />
      <circle cx="170" cy="160" r="16" fill="white" opacity="0.4" />
    </svg>
  );
}
