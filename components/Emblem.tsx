import { event } from "@/lib/event";

type Props = {
  className?: string;
};

export function Emblem({ className }: Props) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={event.emblemSrc} alt="" className={className} />
  );
}
