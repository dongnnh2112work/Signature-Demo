import { RasterSvg } from "@/components/RasterSvg";

type Props = {
  svg: string;
  className?: string;
};

export function SignatureSvg({ svg, className }: Props) {
  return <RasterSvg svg={svg} className={className} />;
}
