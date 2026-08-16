export enum OnboardingMode {
  SELF_SERVE = 'self_serve',
  ENTERPRISE = 'enterprise',
}

export const DEFAULT_ONBOARDING_MODE = OnboardingMode.SELF_SERVE;

export function resolveOnboardingMode(rawValue?: string): OnboardingMode {
  if (rawValue === OnboardingMode.ENTERPRISE) {
    return OnboardingMode.ENTERPRISE;
  }
  return OnboardingMode.SELF_SERVE;
}
