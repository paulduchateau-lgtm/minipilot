import { useState, useEffect, useRef } from "react";
import { Loader2, Check, Merge, Hash, Calendar, Type, AlertTriangle } from "lucide-react";
import { useWorkspaceApi } from "../../lib/WorkspaceContext";

const MIN_STEP_DURATION = 1200;

function getTransformSteps(hasMultipleFiles) {
  return [
    { key: "clean", label: "Nettoyage des donnees", icon: "clean", duration: 1400 },
    { key: "types", label: "Detection des types de colonnes", icon: "types", duration: 1200 },
    { key: "normalize", label: "Normalisation des formats", icon: "normalize", duration: 1000 },
    ...(hasMultipleFiles
      ? [{ key: "merge", label: "Fusion des tables", icon: "merge", duration: 1600 }]
      : []),
    { key: "index", label: "Indexation", icon: "index", duration: 900 },
  ];
}

function StepIcon({ iconKey, status }) {
  const color = status === "done"
    ? "var(--mp-success)"
    : status === "active"
    ? "var(--mp-accent)"
    : "var(--mp-text-muted)";

  if (status === "active") {
    return <Loader2 size={16} color={color} style={{ animation: "spin 1s linear infinite", flexShrink: 0 }} />;
  }
  if (status === "done") {
    return (
      <div style={{
        width: 24, height: 24, borderRadius: "50%",
        background: "rgba(58, 138, 74, 0.15)",
        display: "flex", alignItems: "center", justifyContent: "center",
        flexShrink: 0,
      }}>
        <Check size={13} color="var(--mp-success)" />
      </div>
    );
  }

  const IconMap = { merge: Merge, types: Hash, index: Calendar, normalize: Type, clean: AlertTriangle };
  const Icon = IconMap[iconKey] || Hash;
  return (
    <div style={{
      width: 24, height: 24, borderRadius: "50%",
      background: "var(--mp-bg-elevated)",
      border: "1px solid var(--mp-border)",
      display: "flex", alignItems: "center", justifyContent: "center",
      flexShrink: 0,
    }}>
      <Icon size={12} color={color} />
    </div>
  );
}

export default function OnboardingTransform({ onNext, data }) {
  const api = useWorkspaceApi();
  const hasMultipleFiles = (data?.files?.length || 0) > 1;
  const steps = getTransformSteps(hasMultipleFiles);

  const [stepStatuses, setStepStatuses] = useState(
    steps.reduce((acc, s) => ({ ...acc, [s.key]: "pending" }), {})
  );
  const [activeStep, setActiveStep] = useState(null);
  const [done, setDone] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const hasRun = useRef(false);

  useEffect(() => {
    if (hasRun.current) return;
    hasRun.current = true;

    const run = async () => {
      try {
        // Kick off real transform in background
        const transformPromise = api.transformData().then(res => {
          if (res?.error) throw new Error(res.error);
          return res;
        });

        // Animate through steps with realistic timing
        for (let i = 0; i < steps.length; i++) {
          const step = steps[i];
          setActiveStep(step.key);
          setStepStatuses(prev => ({ ...prev, [step.key]: "active" }));

          await new Promise(r => setTimeout(r, Math.max(step.duration, MIN_STEP_DURATION)));

          setStepStatuses(prev => ({ ...prev, [step.key]: "done" }));
        }

        // Await real result — must succeed before advancing
        const apiResult = await transformPromise;
        setResult(apiResult || {
          cleanedRows: null,
          typedCols: null,
          numericCols: null,
          textCols: null,
          dateCols: null,
          nullValues: null,
          mergedColumn: null,
        });
        setActiveStep(null);
        setDone(true);
      } catch (err) {
        console.error("[OnboardingTransform]", err);
        setError(err?.message || "Une erreur est survenue pendant la preparation des donnees.");
      }
    };

    run();
  }, []);

  const handleNext = () => {
    onNext({ transformResult: result });
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 32 }}>

      {/* Steps timeline */}
      <div style={{
        background: "var(--mp-bg-card)",
        border: "1px solid var(--mp-border)",
        borderRadius: "var(--radius-md)",
        padding: "24px 28px",
      }}>
        <p style={{
          fontFamily: "var(--font-data)", fontSize: 10,
          textTransform: "uppercase", letterSpacing: "0.1em",
          color: "var(--mp-text-muted)", marginBottom: 20,
        }}>
          Preparation des donnees en cours
        </p>

        <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
          {steps.map((step, i) => {
            const status = stepStatuses[step.key];
            const isLast = i === steps.length - 1;

            return (
              <div key={step.key} style={{ display: "flex", gap: 16 }}>
                {/* Timeline column */}
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", width: 24, flexShrink: 0 }}>
                  <StepIcon iconKey={step.icon} status={status} />
                  {!isLast && (
                    <div style={{
                      width: 1,
                      flex: 1,
                      minHeight: 20,
                      background: status === "done" ? "var(--mp-success)" : "var(--mp-border)",
                      margin: "4px 0",
                      transition: "background 0.4s ease",
                    }} />
                  )}
                </div>

                {/* Label */}
                <div style={{
                  paddingBottom: isLast ? 0 : 20,
                  paddingTop: 2,
                  flex: 1,
                }}>
                  <p style={{
                    fontSize: 14,
                    fontFamily: "var(--font-body)",
                    color: status === "done"
                      ? "var(--mp-text)"
                      : status === "active"
                      ? "var(--mp-text)"
                      : "var(--mp-text-muted)",
                    fontWeight: status === "active" ? 500 : 400,
                    margin: 0,
                    transition: "color 0.2s",
                  }}>
                    {step.label}
                    {status === "active" && (
                      <span style={{ color: "var(--mp-text-muted)", fontWeight: 400 }}>&nbsp;—&nbsp;
                        <span style={{ fontStyle: "italic" }}>en cours...</span>
                      </span>
                    )}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Error state */}
      {error && (
        <div style={{
          display: "flex", alignItems: "center", gap: 10,
          background: "rgba(196, 90, 50, 0.08)",
          border: "1px solid rgba(196, 90, 50, 0.25)",
          borderLeft: "3px solid var(--mp-warm)",
          borderRadius: "var(--radius-sm)",
          padding: "12px 16px",
        }}>
          <AlertTriangle size={14} color="var(--mp-warm)" />
          <span style={{ fontSize: 13, color: "var(--mp-warm)", fontFamily: "var(--font-body)" }}>{error}</span>
        </div>
      )}

      {/* Success summary */}
      {done && result && (
        <div className="animate-fade-up" style={{
          background: "rgba(58, 138, 74, 0.06)",
          border: "1px solid rgba(58, 138, 74, 0.2)",
          borderLeft: "3px solid var(--mp-success)",
          borderRadius: "var(--radius-md)",
          padding: "20px 24px",
        }}>
          <p style={{
            fontFamily: "var(--font-data)", fontSize: 10,
            textTransform: "uppercase", letterSpacing: "0.1em",
            color: "var(--mp-success)", marginBottom: 16,
            display: "flex", alignItems: "center", gap: 8,
          }}>
            <Check size={12} />
            Preparation terminee avec succes
          </p>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 16 }}>
            {result.cleanedRows != null && (
              <div className="animate-fade-up" style={{ animationDelay: "0.05s" }}>
                <p style={{
                  fontFamily: "var(--font-data)", fontSize: 10,
                  textTransform: "uppercase", letterSpacing: "0.1em",
                  color: "var(--mp-text-muted)", marginBottom: 4,
                }}>Lignes nettoyees</p>
                <p style={{
                  fontFamily: "var(--font-data)", fontSize: 22,
                  fontWeight: 600, color: "var(--mp-text)",
                  fontVariantNumeric: "tabular-nums",
                }}>
                  {result.cleanedRows.toLocaleString("fr-FR")}
                </p>
              </div>
            )}

            {result.typedCols != null && (
              <div className="animate-fade-up" style={{ animationDelay: "0.1s" }}>
                <p style={{
                  fontFamily: "var(--font-data)", fontSize: 10,
                  textTransform: "uppercase", letterSpacing: "0.1em",
                  color: "var(--mp-text-muted)", marginBottom: 4,
                }}>Colonnes typees</p>
                <p style={{
                  fontFamily: "var(--font-data)", fontSize: 22,
                  fontWeight: 600, color: "var(--mp-text)",
                  fontVariantNumeric: "tabular-nums",
                }}>
                  {result.typedCols}
                </p>
                {(result.numericCols != null || result.textCols != null || result.dateCols != null) && (
                  <p style={{ fontSize: 11, color: "var(--mp-text-muted)", fontFamily: "var(--font-body)", marginTop: 2 }}>
                    {[
                      result.numericCols != null && `${result.numericCols} num.`,
                      result.textCols != null && `${result.textCols} texte`,
                      result.dateCols != null && `${result.dateCols} dates`,
                    ].filter(Boolean).join(" · ")}
                  </p>
                )}
              </div>
            )}

            {result.nullValues != null && (
              <div className="animate-fade-up" style={{ animationDelay: "0.15s" }}>
                <p style={{
                  fontFamily: "var(--font-data)", fontSize: 10,
                  textTransform: "uppercase", letterSpacing: "0.1em",
                  color: "var(--mp-text-muted)", marginBottom: 4,
                }}>Valeurs nulles
                </p>
                <p style={{
                  fontFamily: "var(--font-data)", fontSize: 22,
                  fontWeight: 600,
                  color: result.nullValues > 0 ? "var(--mp-warning)" : "var(--mp-success)",
                  fontVariantNumeric: "tabular-nums",
                }}>
                  {result.nullValues.toLocaleString("fr-FR")}
                </p>
              </div>
            )}

            {result.mergedColumn && hasMultipleFiles && (
              <div className="animate-fade-up" style={{ animationDelay: "0.2s" }}>
                <p style={{
                  fontFamily: "var(--font-data)", fontSize: 10,
                  textTransform: "uppercase", letterSpacing: "0.1em",
                  color: "var(--mp-text-muted)", marginBottom: 4,
                }}>Cle de fusion</p>
                <p style={{
                  fontFamily: "var(--font-data)", fontSize: 13,
                  fontWeight: 500, color: "var(--mp-signal)",
                }}>
                  {result.mergedColumn}
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Next button */}
      <div style={{ display: "flex", justifyContent: "flex-end" }}>
        <button
          onClick={handleNext}
          disabled={!done}
          style={{
            background: done ? "var(--mp-accent)" : "var(--mp-border)",
            color: done ? "var(--mp-accent-on)" : "var(--mp-text-muted)",
            border: "none", borderRadius: "var(--radius-md)",
            padding: "10px 24px", fontSize: 14, fontWeight: 500,
            fontFamily: "var(--font-body)", cursor: done ? "pointer" : "not-allowed",
            display: "flex", alignItems: "center", gap: 8,
            transition: "background 0.15s, color 0.15s",
          }}
        >
          {done ? (
            <>Suivant <span style={{ fontSize: 16, lineHeight: 1 }}>&#8594;</span></>
          ) : (
            <>
              <Loader2 size={14} style={{ animation: "spin 1s linear infinite" }} />
              Preparation en cours...
            </>
          )}
        </button>
      </div>
    </div>
  );
}
