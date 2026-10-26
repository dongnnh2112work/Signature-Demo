import { splitWish } from "@/lib/wish";

type Props = {
  message: string;
  className?: string;
};

export function WishBanner({ message, className }: Props) {
  const { title, subtitle } = splitWish(message);
  return (
    <article className={`wish-banner ${className ?? ""}`}>
      <span className="wish-ornament wish-ornament-l" aria-hidden />
      <div className="wish-banner-copy">
        <p className="wish-title">{title || "…"}</p>
        {subtitle ? <p className="wish-sub">{subtitle}</p> : null}
      </div>
      <span className="wish-ornament wish-ornament-r" aria-hidden />
    </article>
  );
}
