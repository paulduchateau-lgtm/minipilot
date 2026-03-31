import { useState, useEffect } from "react";
import { Check, Upload, FileText, Wand2, CheckCircle, Sparkles, Loader2 } from "lucide-react";
import { useWorkspaceApi } from "../../lib/WorkspaceContext";
import OnboardingUpload from "./OnboardingUpload";
import OnboardingContext from "./OnboardingContext";
import OnboardingTransform from "./OnboardingTransform";
import OnboardingVerify from "./OnboardingVerify";
import OnboardingSuggest from "./OnboardingSuggest";

const STEPS = [
  { key: "upload", label: "Donnees", Icon: Upload },
  { key: "context", label: "Contexte", Icon: FileText },
  { key: "transform", label: "Preparation", Icon: Wand2 },
  { key: "verify", label: "Verification", Icon: CheckCircle },
  { key: "suggest", label: "Rapports IA", Icon: Sparkles },
];

function StepIndicator({ steps, currentStep, completedSteps }) {
  return (
    <div style={{
      display: "flex", alignItems: "center",
      padding: "24px 0 32px",
    }}>
      {steps.map((step, i) => {
        const StepIcon = step.Icon;
        const isActive = step.key === currentStep;
        const isCompleted = completedSteps.has(step.key);
        const isLast = i === steps.length - 1;

        return (
          <div key={step.key} style={{ display: "flex", alignItems: "center", flex: isLast ? 0 : 1 }}>
            {/* Step node */}
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8, flexShrink: 0 }}>
              <div style={{
                width: 36, height: 36,
                borderRadius: "50%",
                background: isCompleted
                  ? "rgba(58, 138, 74, 0.15)"
                  : isActive
                  ? "var(--mp-accent-dim)"
                  : "var(--mp-bg-elevated)",
                border: `2px solid ${
                  isCompleted
                    ? "var(--mp-success)"
                    : isActive
                    ? "var(--mp-accent)"
                    : "var(--mp-border)"
                }`,
                display: "flex", alignItems: "center", justifyContent: "center",
                transition: "all 0.25s ease",
              }}>
                {isCompleted ? (
                  <Check size={15} color="var(--mp-success)" />
                ) : (
                  <StepIcon
                    size={15}
                    color={isActive ? "var(--mp-accent)" : "var(--mp-text-muted)"}
                  />
                )}
              </div>

              <span style={{
                fontFamily: "var(--font-data)", fontSize: 10,
                textTransform: "uppercase", letterSpacing: "0.1em",
                color: isActive
                  ? "var(--mp-accent-text)"
                  : isCompleted
                  ? "var(--mp-success)"
                  : "var(--mp-text-muted)",
                whiteSpace: "nowrap",
                transition: "color 0.2s",
              }}>
                {step.label}
              </span>
            </div>

            {/* Connector line */}
            {!isLast && (
              <div style={{
                flex: 1,
                height: 2,
                marginBottom: 24,
                marginLeft: 8,
                marginRight: 8,
                background: isCompleted ? "var(--mp-success)" : "var(--mp-border)",
                transition: "background 0.4s ease",
                borderRadius: 9999,
              }} />
            )}
          </div>
        );
      })}
    </div>
  );
}

export default function OnboardingWizard({ onComplete }) {
  const api = useWorkspaceApi();
  const [currentStep, setCurrentStep] = useState(null);
  const [completedSteps, setCompletedSteps] = useState(new Set());
  const [stepData, setStepData] = useState({});
  const [loading, setLoading] = useState(true);

  // Resume from last saved step
  useEffect(() => {
    const resume = async () => {
      try {
        const status = await api.getOnboardingStatus();
        const lastStep = status?.currentStep || "upload";
        const completed = new Set(status?.completedSteps || []);
        const savedData = status?.data || {};
        setCurrentStep(lastStep);
        setCompletedSteps(completed);
        setStepData(savedData);
      } catch {
        // Fresh start
        setCurrentStep("upload");
      } finally {
        setLoading(false);
      }
    };
    resume();
  }, []);

  const currentIndex = STEPS.findIndex(s => s.key === currentStep);

  const handleNext = (data) => {
    const newStepData = { ...stepData, [currentStep]: data };
    setStepData(newStepData);

    const newCompleted = new Set(completedSteps);
    newCompleted.add(currentStep);
    setCompletedSteps(newCompleted);

    if (currentStep === "suggest") {
      onComplete(data?.reports || []);
      return;
    }

    const nextIndex = currentIndex + 1;
    if (nextIndex < STEPS.length) {
      setCurrentStep(STEPS[nextIndex].key);
    }
  };

  const handleBack = () => {
    if (currentIndex > 0) {
      setCurrentStep(STEPS[currentIndex - 1].key);
    }
  };

  const renderStep = () => {
    const props = {
      onNext: handleNext,
      data: stepData[currentStep],
    };

    switch (currentStep) {
      case "upload":
        return <OnboardingUpload {...props} />;
      case "context":
        return <OnboardingContext {...props} data={{ ...stepData.context, files: stepData.upload?.files }} />;
      case "transform":
        return <OnboardingTransform {...props} data={{ files: stepData.upload?.files }} />;
      case "verify":
        return <OnboardingVerify {...props} />;
      case "suggest":
        return <OnboardingSuggest {...props} />;
      default:
        return null;
    }
  };

  if (loading) {
    return (
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "center",
        minHeight: "60vh", flexDirection: "column", gap: 16,
      }}>
        <Loader2 size={28} color="var(--mp-accent)" style={{ animation: "spin 1s linear infinite" }} />
        <p style={{ fontSize: 13, color: "var(--mp-text-muted)", fontFamily: "var(--font-body)" }}>
          Chargement...
        </p>
      </div>
    );
  }

  return (
    <div style={{
      minHeight: "100vh",
      background: "var(--mp-bg)",
      display: "flex", justifyContent: "center",
      padding: "40px 24px 80px",
    }}>
      <div style={{ width: "100%", maxWidth: 800 }}>

        {/* Header */}
        <div className="animate-fade-up" style={{ marginBottom: 8, textAlign: "center" }}>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", marginBottom: 8 }}>
            <span style={{
              fontFamily: "var(--font-display)", fontSize: 22,
              fontWeight: 300, fontStyle: "italic",
              color: "var(--mp-accent-text)",
            }}>Pilot</span>
            <span style={{
              fontFamily: "var(--font-data)", fontSize: 8,
              textTransform: "uppercase", letterSpacing: "0.12em",
              color: "var(--mp-text-muted)", marginTop: 2,
            }}>by Lite Ops</span>
          </div>
          <h1 style={{
            fontFamily: "var(--font-display)", fontSize: 28,
            fontWeight: 400, color: "var(--mp-text)",
            margin: "0 0 8px", lineHeight: 1.3,
          }}>
            Configuration initiale
          </h1>
          <p style={{
            fontSize: 14, color: "var(--mp-text-muted)",
            fontFamily: "var(--font-body)", maxWidth: 480, margin: "0 auto",
          }}>
            Importez vos donnees, definissez le contexte metier et laissez l'IA preparer vos premiers rapports.
          </p>
        </div>

        {/* Stepper */}
        <StepIndicator
          steps={STEPS}
          currentStep={currentStep}
          completedSteps={completedSteps}
        />

        {/* Step card */}
        <div
          key={currentStep}
          className="animate-fade-up"
          style={{
            background: "var(--mp-bg-card)",
            border: "1px solid var(--mp-border)",
            borderRadius: "var(--radius-lg)",
            padding: "32px 36px",
            marginBottom: 24,
          }}
        >
          {/* Step header */}
          <div style={{ marginBottom: 28 }}>
            <p style={{
              fontFamily: "var(--font-data)", fontSize: 10,
              textTransform: "uppercase", letterSpacing: "0.1em",
              color: "var(--mp-text-muted)", marginBottom: 6,
            }}>
              Etape {currentIndex + 1} sur {STEPS.length}
            </p>
            <h2 style={{
              fontFamily: "var(--font-display)", fontSize: 20,
              fontWeight: 400, color: "var(--mp-text)",
              margin: 0,
            }}>
              {currentStep === "upload" && "Importer vos donnees"}
              {currentStep === "context" && "Definir le contexte projet"}
              {currentStep === "transform" && "Preparation des donnees"}
              {currentStep === "verify" && "Verifier les donnees"}
              {currentStep === "suggest" && "Suggestions de rapports IA"}
            </h2>
          </div>

          {renderStep()}
        </div>

        {/* Back navigation (not shown on step 1 or transform/suggest which auto-progress) */}
        {currentIndex > 0 && currentStep !== "transform" && currentStep !== "suggest" && (
          <div style={{ display: "flex", justifyContent: "flex-start" }}>
            <button
              onClick={handleBack}
              style={{
                background: "none", border: "none", cursor: "pointer",
                display: "flex", alignItems: "center", gap: 6,
                color: "var(--mp-text-muted)", fontSize: 13,
                fontFamily: "var(--font-body)", padding: "6px 0",
                transition: "color 0.15s",
              }}
              onMouseEnter={e => e.currentTarget.style.color = "var(--mp-text)"}
              onMouseLeave={e => e.currentTarget.style.color = "var(--mp-text-muted)"}
            >
              <span style={{ fontSize: 14 }}>&#8592;</span>
              Etape precedente
            </button>
          </div>
        )}

        {/* Privacy notice */}
        <p style={{
          fontFamily: "var(--font-data)", fontSize: 9,
          textTransform: "uppercase", letterSpacing: "0.1em",
          color: "var(--mp-text-muted)", textAlign: "center",
          marginTop: 32,
        }}>
          SLM locaux — aucune donnee ne quitte votre infrastructure
        </p>
      </div>
    </div>
  );
}
