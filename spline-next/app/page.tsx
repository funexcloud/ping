import Spline from '@splinetool/react-spline/next';
import { WaveCanvas } from '@/components/WaveCanvas';

const SPLINE_SCENE = 'https://prod.spline.design/Pny-bfOWOFWOzIaO/scene.splinecode';

export default function Home() {
  return (
    <main className="relative h-[100dvh] w-full overflow-hidden bg-black">
      {/* 배경: U 웨이브 + 도트 — 클릭은 Spline으로 전달 (리플 끄기) */}
      <WaveCanvas
        className="absolute inset-0 z-0 h-full w-full"
        pointerEvents="none"
      />

      {/* 전경: Spline 3D — 살짝 어둡게 넣어 배경 홀로그램과 이어지게 */}
      <div
        className="absolute inset-0 z-10 flex items-center justify-center
          [&_.spline-container]:h-full [&_.spline-container]:min-h-0
          [&_.spline-container]:w-full [&_canvas]:h-full [&_canvas]:w-full
          [&_canvas]:object-contain"
        style={{
          mixBlendMode: 'normal',
          filter: 'drop-shadow(0 0 48px rgba(0,0,0,0.35))',
        }}
      >
        <Spline scene={SPLINE_SCENE} className="h-full w-full" />
      </div>

      {/* 가장자리: 배경이 살짝 비치는 비네트 (선택적 깊이) */}
      <div
        className="pointer-events-none absolute inset-0 z-20"
        style={{
          background:
            'radial-gradient(ellipse 80% 70% at 50% 45%, transparent 35%, rgba(0,0,0,0.55) 100%)',
        }}
      />
    </main>
  );
}
