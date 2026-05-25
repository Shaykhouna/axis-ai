import { JSX } from "react";
import { OnboardingWizard } from "../modules/onboarding";
import { Owner } from "../modules/core"

interface Props {
  onComplete: () => Promise<void>;
  owner: Owner;
}

export function OnboardingPage({ onComplete, owner }: Props): JSX.Element {
  return <OnboardingWizard onComplete={onComplete} owner={owner} />;
}