export type Role = 'USER' | 'PROVIDER';

/** What we persist in browser storage to restore a session on reload. */
export interface Session {
  role: Role;
  token?: string;
  refreshToken?: string;
  profileId: number;
  email: string;
  displayName: string;
}
