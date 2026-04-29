"use client";

import { motion } from "framer-motion";
import { CheckCircle } from "lucide-react";

type Step = { n: number; label: string; desc?: string };

export function WorkflowStepper({
  steps,
  activeStep,
  isStepCompleted,
  className = "",
}: {
  steps: Step[];
  activeStep: number;
  isStepCompleted: (step: number) => boolean;
  className?: string;
}) {
  return (
    <div
      className={[
        "rounded-lg border border-gray-200 bg-white px-3 py-2.5 shadow-sm",
        "admin-dark:border-[var(--admin-border)] admin-dark:bg-slate-900/20",
        className,
      ].join(" ")}
    >
      <div className="flex items-center gap-2 overflow-x-auto">
        <div className="flex min-w-[680px] flex-1 items-center gap-2">
          {steps.map((s, i) => {
            const step = i + 1;
            const completed = isStepCompleted(step);
            const active = step === activeStep;

            return (
              <div key={s.n} className="flex flex-1 items-center gap-2">
                <div
                  className={[
                    "relative flex min-w-0 flex-1 items-center gap-2 overflow-hidden rounded-lg border px-2.5 py-1.5 transition-colors",
                    completed
                      ? "border-amber-300 bg-amber-50/80 admin-dark:border-amber-400/40 admin-dark:bg-amber-400/10"
                      : active
                        ? "border-amber-400 bg-white shadow-sm admin-dark:bg-slate-900/10"
                        : "border-gray-200 bg-gray-50 admin-dark:border-[var(--admin-border)] admin-dark:bg-slate-900/30",
                  ].join(" ")}
                >
                  {active && (
                    <motion.div
                      className="pointer-events-none absolute inset-0 bg-gradient-to-r from-transparent via-amber-100/40 to-transparent admin-dark:via-amber-300/10"
                      animate={{ x: ["-120%", "120%"] }}
                      transition={{ duration: 1.2, repeat: Infinity, ease: "linear" }}
                    />
                  )}

                  <div
                    className={[
                      "relative z-10 flex h-6 w-6 items-center justify-center rounded-full font-bold text-[11px]",
                      completed
                        ? "bg-green-500 text-white"
                        : active
                          ? "bg-amber-400 text-slate-900"
                          : "border border-gray-200 bg-white text-gray-400 admin-dark:border-[var(--admin-border)] admin-dark:bg-slate-900/20",
                    ].join(" ")}
                  >
                    {completed ? <CheckCircle className="h-3.5 w-3.5" /> : s.n}
                  </div>

                  <div className="relative z-10 min-w-0">
                    <p
                      className={[
                        "truncate text-[11px] font-bold leading-tight",
                        completed || active
                          ? "text-amber-800 admin-dark:text-amber-200"
                          : "text-gray-700 admin-dark:text-[var(--admin-text)]",
                      ].join(" ")}
                    >
                      {s.label}
                    </p>
                    {s.desc ? (
                      <p className="truncate text-[10px] text-gray-400 leading-tight admin-dark:text-[var(--admin-muted)]">
                        {s.desc}
                      </p>
                    ) : null}
                  </div>
                </div>

                {i < steps.length - 1 && (
                  <div className="relative h-[2px] w-5 overflow-hidden rounded bg-gray-200 admin-dark:bg-slate-700/50">
                    {step < activeStep - 1 && <div className="h-full w-full bg-amber-400" />}
                    {step === activeStep - 1 && (
                      <motion.div
                        className="h-full w-1/2 bg-amber-400"
                        animate={{ x: ["-120%", "220%"] }}
                        transition={{ duration: 0.9, repeat: Infinity, ease: "linear" }}
                      />
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

