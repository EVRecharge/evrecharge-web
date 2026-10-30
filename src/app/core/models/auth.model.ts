export type Role = 'USER' | 'PROVIDER';

/** Returned instead of tokens when the account has two-factor authentication on. */
export interface MfaChallenge {
  mfaRequired: true;
  mfaToken: string;
}

/** What we persist in browser storage to restore a session on reload. */
export interface Session {
  role: Role;
  token?: string;
  refreshToken?: string;
  profileId: number;
  email: string;
  displayName: string;
}
