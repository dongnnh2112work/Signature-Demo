"use client";

import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
} from "react";
import SignaturePadLib from "signature_pad";

export type SignaturePadHandle = {
  clear: () => void;
  isEmpty: () => boolean;
  toSVG: () => string;
};

type Props = {
  className?: string;
};

export const SignaturePad = forwardRef<SignaturePadHandle, Props>(
  function SignaturePad({ className }, ref) {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const padRef = useRef<SignaturePadLib | null>(null);

    useEffect(() => {
      const canvas = canvasRef.current;
      if (!canvas) {
        return;
      }

      const pad = new SignaturePadLib(canvas, {
        backgroundColor: "rgba(0,0,0,0)",
        penColor: "rgb(250, 244, 230)",
        minWidth: 1.4,
        maxWidth: 3.2,
        throttle: 8,
      });
      padRef.current = pad;

      const resize = () => {
        const data = pad.toData();
        const ratio = Math.max(window.devicePixelRatio || 1, 1);
        const width = canvas.offsetWidth;
        const height = canvas.offsetHeight;
        canvas.width = Math.floor(width * ratio);
        canvas.height = Math.floor(height * ratio);
        const ctx = canvas.getContext("2d");
        ctx?.scale(ratio, ratio);
        pad.clear();
        if (data.length) {
          pad.fromData(data);
        }
      };

      resize();
      const observer = new ResizeObserver(resize);
      observer.observe(canvas);

      return () => {
        observer.disconnect();
        pad.off();
        padRef.current = null;
      };
    }, []);

    useImperativeHandle(ref, () => ({
      clear: () => padRef.current?.clear(),
      isEmpty: () => padRef.current?.isEmpty() ?? true,
      toSVG: () => padRef.current?.toSVG({ includeBackgroundColor: false }) ?? "",
    }));

    return (
      <canvas
        ref={canvasRef}
        className={className}
        aria-label="Khung chữ ký"
      />
    );
  },
);
