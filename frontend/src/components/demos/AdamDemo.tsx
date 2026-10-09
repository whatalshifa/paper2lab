"use client";

import { type ReactNode, useEffect, useId, useMemo, useState } from "react";

const STEPS = 60;
const RATES = [0.001, 0.003, 0.01, 0.03, 0.05, 0.1, 0.15, 0.2, 0.3, 0.5];
const BETA2S = [0.9, 0.99, 0.999, 0.9999];
const EPSILON = 1e-8;
const START: Point = [-2.4, 1.4];
const ANGLE = 0.45; // the valley's tilt, in radians
const FLAT = 0.05; // curvature along the valley floor
const STEEP = 5; // curvature across it: a hundred times steeper

type Point = [number, number];

/** The loss: a narrow, tilted valley with its lowest point at (0, 0). */
function along(x: number, y: number): Point {
  const c = Math.cos(ANGLE);
  const s = Math.sin(ANGLE);
  return [c * x + s * y, -s * x + c * y];
}
function loss([x, y]: Point) {
  const [u, w] = along(x, y);
  return 0.5 * (FLAT * u * u + STEEP * w * w);
}
function gradient([x, y]: Point): Point {
  const [u, w] = along(x, y);
  const c = Math.cos(ANGLE);
  const s = Math.sin(ANGLE);
  const du = FLAT * u;
  const dw = STEEP * w;
  return [c * du - s * dw, s * du + c * dw];
}

const clamp = (n: number) => (Number.isFinite(n) ? Math.max(-1e4, Math.min(1e4, n)) : 1e4);

function runSgd(rate: number) {
  const path: Point[] = [START];
  let p = START;
  for (let t = 1; t <= STEPS; t++) {
    const g = gradient(p);
    p = [clamp(p[0] - rate * g[0]), clamp(p[1] - rate * g[1])];
    path.push(p);
  }
  return path;
}

/** Algorithm 1 of the paper, step for step. With bias correction off, m and v are used as they are. */
function runAdam(rate: number, beta1: number, beta2: number, correct: boolean) {
  const path: Point[] = [START];
  let p = START;
  const m = [0, 0];
  const v = [0, 0];
  for (let t = 1; t <= STEPS; t++) {
    const g = gradient(p);
    const next: Point = [0, 0];
    for (let i = 0; i < 2; i++) {
      m[i] = beta1 * m[i] + (1 - beta1) * g[i];
      v[i] = beta2 * v[i] + (1 - beta2) * g[i] * g[i];
      const mHat = correct ? m[i] / (1 - beta1 ** t) : m[i];
      const vHat = correct ? v[i] / (1 - beta2 ** t) : v[i];
      next[i] = clamp(p[i] - (rate * mHat) / (Math.sqrt(vHat) + EPSILON));
    }
    p = next;
    path.push(p);
  }
  return path;
}

// The picture shows x from −3 to 3 and y from −2 to 2, 50 pixels per unit, y pointing up.
const toSvg = ([x, y]: Point) => `${((x + 3) * 50).toFixed(1)},${((2 - y) * 50).toFixed(1)}`;

/** Contour lines are ellipses: loss = c where u²/(2c/FLAT) + w²/(2c/STEEP) = 1. */
const CONTOURS = [0.02, 0.1, 0.3, 0.8, 1.6, 3, 5, 8, 12].map((c) => {
  const a = Math.sqrt((2 * c) / FLAT);
  const b = Math.sqrt((2 * c) / STEEP);
  const points: string[] = [];
  for (let k = 0; k <= 64; k++) {
    const t = (k / 64) * 2 * Math.PI;
    const u = a * Math.cos(t);
    const w = b * Math.sin(t);
    points.push(toSvg([u * Math.cos(ANGLE) - w * Math.sin(ANGLE), u * Math.sin(ANGLE) + w * Math.cos(ANGLE)]));
  }
  return points.join(" ");
});

/** A labelled slider that shows its value. */
function Slider(props: {
  label: ReactNode;
  value: string;
  index: number;
  max: number;
  step?: number;
  onChange: (n: number) => void;
}) {
  const id = useId();
  return (
    <div>
      <div className="flex items-baseline justify-between gap-3 text-sm">
        <label htmlFor={id} className="font-semibold">
          {props.label}
        </label>
        <span className="font-mono text-muted">{props.value}</span>
      </div>
      <input
        id={id}
        type="range"
        min={0}
        max={props.max}
        step={props.step ?? 1}
        value={props.index}
        onChange={(event) => props.onChange(Number(event.target.value))}
        aria-valuetext={props.value}
        className="level-range mt-2"
      />
    </div>
  );
}

/** Plain SGD and Adam walk down the same narrow valley from the same start. */
export function AdamDemo() {
  const id = useId();
  const [rateIndex, setRateIndex] = useState(7);
  const [beta1, setBeta1] = useState(0.9);
  const [beta2Index, setBeta2Index] = useState(2);
  const [correct, setCorrect] = useState(true);
  const [step, setStep] = useState(STEPS);
  const [playing, setPlaying] = useState(false);

  const rate = RATES[rateIndex];
  const beta2 = BETA2S[beta2Index];
  const sgd = useMemo(() => runSgd(rate), [rate]);
  const adam = useMemo(() => runAdam(rate, beta1, beta2, correct), [rate, beta1, beta2, correct]);

  const running = playing && step < STEPS;
  useEffect(() => {
    if (!running) return;
    const timer = setInterval(() => setStep((s) => Math.min(s + 1, STEPS)), 120);
    return () => clearInterval(timer);
  }, [running]);

  const sgdLoss = loss(sgd[step]);
  const adamLoss = loss(adam[step]);
  const show = (n: number) => (n > 1e3 ? "blew up" : n < 1e-4 ? n.toExponential(1) : n.toFixed(4));

  // SGD zig-zags when its position across the valley keeps changing sign.
  let flips = 0;
  for (let t = 1; t <= step; t++) if (along(...sgd[t])[1] * along(...sgd[t - 1])[1] < 0) flips++;
  const firstStep = (1 - beta1) / Math.sqrt(1 - beta2); // uncorrected step size at t = 1, in units of α

  let message: string;
  if (step === 0) {
    message = "Both start at the same point. Press Play or drag the step slider.";
  } else if (sgdLoss > loss(START) * 10) {
    message = "This learning rate is too big for SGD on the steep side of the valley, so it blows up. Adam's steps stay about α long, so it does not.";
  } else if (!correct && step <= 10 && Math.abs(firstStep - 1) > 0.2) {
    message = `Bias correction is off, so m and v start near zero and Adam's first step is about ${firstStep.toFixed(1)}× α: ${
      firstStep > 1 ? "too big" : "too timid"
    }. The paper divides by 1 − βᵗ to fix exactly this.`;
  } else if (flips >= 3 && adamLoss < sgdLoss) {
    message = "Adam takes even-sized steps in both directions; SGD zig-zags across the narrow valley and crawls along it.";
  } else if (adamLoss < sgdLoss) {
    message = "Adam is lower: scaling each step by √v̂ keeps it moving along the gentle floor of the valley.";
  } else {
    message = "SGD is lower here: with a well-chosen step on a smooth bowl, plain gradient descent can win too. Adam keeps hopping around the minimum at roughly α per step.";
  }

  return (
    <div className="space-y-5">
      <svg
        viewBox="0 0 300 200"
        width="100%"
        role="img"
        aria-label={`Loss contours of a narrow tilted valley, with the paths of SGD and Adam after ${step} of ${STEPS} steps.`}
        className="block rounded-xl border border-line bg-sunken"
      >
        <g fill="none" className="text-muted" stroke="currentColor" strokeWidth={0.75} opacity={0.5}>
          {CONTOURS.map((points, i) => (
            <polyline key={i} points={points} />
          ))}
        </g>
        <polyline
          points={sgd.slice(0, step + 1).map(toSvg).join(" ")}
          fill="none"
          stroke="currentColor"
          strokeWidth={1.75}
          strokeLinejoin="round"
          className="text-rose-700 dark:text-rose-300"
        />
        <polyline
          points={adam.slice(0, step + 1).map(toSvg).join(" ")}
          fill="none"
          stroke="currentColor"
          strokeWidth={1.75}
          strokeLinejoin="round"
          className="text-indigo-700 dark:text-indigo-300"
        />
        <circle cx={150} cy={100} r={3} className="fill-foreground" />
        <circle cx={(START[0] + 3) * 50} cy={(2 - START[1]) * 50} r={3.5} className="fill-muted" />
      </svg>

      <ul className="flex flex-wrap gap-x-5 gap-y-1 text-sm" aria-label="Legend and current loss">
        <li className="flex items-center gap-2">
          <span className="h-1 w-5 rounded-full bg-rose-700 dark:bg-rose-300" aria-hidden />
          SGD, loss <span className="font-mono tabular-nums">{show(sgdLoss)}</span>
        </li>
        <li className="flex items-center gap-2">
          <span className="h-1 w-5 rounded-full bg-indigo-700 dark:bg-indigo-300" aria-hidden />
          Adam, loss <span className="font-mono tabular-nums">{show(adamLoss)}</span>
        </li>
        <li className="flex items-center gap-2 text-muted">
          <span className="h-2 w-2 rounded-full bg-muted" aria-hidden /> start
          <span className="ml-2 h-2 w-2 rounded-full bg-foreground" aria-hidden /> minimum
        </li>
      </ul>

      <p className="rounded-xl bg-accent-soft px-4 py-3 text-sm leading-relaxed" aria-live="polite">
        {message}
      </p>

      <div className="flex flex-wrap items-end gap-3">
        <div className="min-w-40 flex-1">
          <Slider label="Step t" value={`${step} / ${STEPS}`} index={step} max={STEPS} onChange={setStep} />
        </div>
        <button
          type="button"
          className="btn btn-secondary btn-sm"
          onClick={() => {
            if (step >= STEPS) setStep(0);
            setPlaying(!running);
          }}
        >
          {running ? "Pause" : "Play"}
        </button>
        <button
          type="button"
          className="btn btn-secondary btn-sm"
          onClick={() => {
            setPlaying(false);
            setStep(0);
          }}
        >
          Reset
        </button>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Slider label="Learning rate α" value={String(rate)} index={rateIndex} max={RATES.length - 1} onChange={setRateIndex} />
        <Slider label="β₁" value={beta1.toFixed(2)} index={Math.round(beta1 * 100)} max={99} onChange={(n) => setBeta1(n / 100)} />
        <Slider label="β₂" value={String(beta2)} index={beta2Index} max={BETA2S.length - 1} onChange={setBeta2Index} />
      </div>

      <div className="flex items-center gap-2 text-sm">
        <input
          id={`${id}-correct`}
          type="checkbox"
          checked={correct}
          onChange={(event) => setCorrect(event.target.checked)}
          className="h-4 w-4 accent-indigo-700 dark:accent-indigo-300"
        />
        <label htmlFor={`${id}-correct`} className="font-semibold">
          Bias correction (m̂ = m / (1 − β₁ᵗ), v̂ = v / (1 − β₂ᵗ))
        </label>
      </div>
    </div>
  );
}
