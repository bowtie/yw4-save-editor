/** Platform badges — rounded-square marks served from `icons/platforms/`. */

export function platformBadgeUrl(platform: "switch" | "ps4"): string {
  const file = platform === "switch" ? "nintendo-switch.svg" : "playstation.svg";
  return new URL(`icons/platforms/${file}`, document.baseURI).href;
}

export function PlatformBadge({
  platform,
  size = 22,
  className,
}: {
  platform: "switch" | "ps4";
  size?: number;
  className?: string;
}) {
  return (
    <img
      src={platformBadgeUrl(platform)}
      alt={platform === "switch" ? "Nintendo Switch" : "PlayStation 4"}
      className={`inline-block shrink-0 rounded-[22%] object-contain ${className ?? ""}`}
      style={{ width: size, height: size }}
    />
  );
}
