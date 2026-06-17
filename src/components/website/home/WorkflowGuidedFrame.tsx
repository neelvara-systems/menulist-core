"use client";

import type { CSSProperties, ReactNode } from "react";
import { useEffect, useRef, useState } from "react";

export type WorkflowGuidedStep = {
  number: string;
  title: string;
  desc: string;
};

interface WorkflowGuidedFrameProps {
  label: string;
  title: string;
  desc: string;
  steps: WorkflowGuidedStep[];
  children: ReactNode;
}

type WorkflowGuidedStyle = CSSProperties & {
  "--ws-workflow-story-progress"?: string;
};

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

export default function WorkflowGuidedFrame({
  label,
  title,
  desc,
  steps,
  children,
}: WorkflowGuidedFrameProps) {
  const frameRef = useRef<HTMLDivElement>(null);
  const [activeStep, setActiveStep] = useState(0);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    if (steps.length === 0 || typeof window === "undefined") {
      return;
    }

    let frameId = 0;

    const updateProgress = () => {
      frameId = 0;
      const frame = frameRef.current;

      if (!frame) {
        return;
      }

      const rect = frame.getBoundingClientRect();
      const viewportHeight = window.innerHeight || document.documentElement.clientHeight;
      const readableStart = viewportHeight * 0.68;
      const readableEnd = Math.max(rect.height + viewportHeight * 0.18, 1);
      const nextProgress = clamp((readableStart - rect.top) / readableEnd, 0, 1);
      const roundedProgress = Math.round(nextProgress * 100) / 100;
      const nextStep = Math.min(steps.length - 1, Math.floor(nextProgress * steps.length));

      setProgress((currentProgress) => (currentProgress === roundedProgress ? currentProgress : roundedProgress));
      setActiveStep((currentStep) => (currentStep === nextStep ? currentStep : nextStep));
    };

    const queueUpdate = () => {
      if (frameId) {
        return;
      }

      frameId = window.requestAnimationFrame(updateProgress);
    };

    updateProgress();
    window.addEventListener("scroll", queueUpdate, { passive: true });
    window.addEventListener("resize", queueUpdate);

    return () => {
      window.removeEventListener("scroll", queueUpdate);
      window.removeEventListener("resize", queueUpdate);

      if (frameId) {
        window.cancelAnimationFrame(frameId);
      }
    };
  }, [steps.length]);

  const activeStepContent = steps[activeStep] ?? steps[0] ?? {
    number: "",
    title: "",
    desc: "",
  };
  const style: WorkflowGuidedStyle = {
    "--ws-workflow-story-progress": `${progress}`,
  };

  return (
    <div ref={frameRef} className="ws-workflow-guided" style={style}>
      <aside className="ws-workflow-guided__rail" aria-label={label}>
        <div className="ws-workflow-guided__intro">
          <span className="ws-workflow-guided__eyebrow">{label}</span>
          <h3>{title}</h3>
          <p>{desc}</p>
        </div>
        <div className="ws-workflow-guided__track" aria-hidden="true">
          <span />
        </div>
        <ol className="ws-workflow-guided__steps">
          {steps.map((step, index) => {
            const isActive = activeStep === index;

            return (
              <li
                className="ws-workflow-guided__step"
                data-active={isActive ? "true" : "false"}
                aria-current={isActive ? "step" : undefined}
                key={step.number}
              >
                <span className="ws-workflow-guided__number">{step.number}</span>
                <span className="ws-workflow-guided__copy">
                  <strong>{step.title}</strong>
                  <span>{step.desc}</span>
                </span>
              </li>
            );
          })}
        </ol>
      </aside>

      <div className="ws-workflow-guided__visual">
        <div className="ws-workflow-guided__active-proof" aria-hidden="true">
          <span>{activeStepContent.number}</span>
          <strong>{activeStepContent.title}</strong>
        </div>
        {children}
      </div>
    </div>
  );
}
