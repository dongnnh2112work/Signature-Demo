import type { Ref } from "react";
import { event } from "@/lib/event";

type Props = {
  className?: string;
  ref?: Ref<HTMLImageElement>;
};

export function Emblem({ className, ref }: Props) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img ref={ref} src={event.emblemSrc} alt="" className={className} />
  );
}
