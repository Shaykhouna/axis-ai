import { JSX, ReactNode, useEffect, useState } from "react";
import { Owner } from "../../core";
import { getSettings } from "../../settings";
import { OnboardingWizard } from "./OnboardingWizard";
import { COLORS } from "../../../lib/theme";
import { ensureDefaultVault } from "../../vault"

interface Props {
  children: ReactNode;
  owner: Owner;
}

export function OnboardingGate({ children, owner }: Props): JSX.Element {
  //const owner = useOwner();
  const [onboardingComplete, setOnboardingComplete] = useState<boolean | null>(null);

  async function check(): Promise<void> {
    if (owner === null) return;
    // Idempotent — runs once per owner, no-op thereafter
    await ensureDefaultVault(owner.id);
    const settings = await getSettings(owner.id);
    setOnboardingComplete(settings.onboarding_completed === 1);
  }

  useEffect(() => {
    void check();
  }, [owner?.id]);

  if (owner === null || onboardingComplete === null) {
    return (
      <div style={{
        minHeight: "100vh",
        background: "#0a0e14",
        color: COLORS.textFaint,
        display: "flex", alignItems: "center", justifyContent: "center",
        fontSize: "12px",
      }}>
        Loading…
      </div>
    );
  }

  if (!onboardingComplete) {
    return <OnboardingWizard onComplete={check} owner={owner} />;
  }

  return <>{children}</>;
}