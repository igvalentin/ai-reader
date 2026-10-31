export { useAuth } from "./use-auth";
export type { AuthState, AuthUser } from "./use-auth";

export {
  signInWithEmail,
  signUpWithEmail,
  signInWithGoogle,
  sendPasswordReset,
  updatePassword,
  signOut,
} from "./actions";

export { SignInCTA } from "./sign-in-cta";
export { AuthenticatedFeatureCTA } from "./authenticated-feature-cta";

export { useProfile, useUpdateProfile } from "./use-profile";
export type { Profile } from "./use-profile";
