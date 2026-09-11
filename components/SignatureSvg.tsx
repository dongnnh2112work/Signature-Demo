function sanitizeSvg(svg: string) {
  return svg
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/\s+on\w+="[^"]*"/gi, "")
    .replace(/\s+on\w+='[^']*'/gi, "");
}

type Props = {
  svg: string;
  className?: string;
};

export function SignatureSvg({ svg, className }: Props) {
  return (
    <div
      className={`signature-svg ${className ?? ""}`}
      dangerouslySetInnerHTML={{ __html: sanitizeSvg(svg) }}
    />
  );
}
