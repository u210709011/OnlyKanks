export namespace Auth {
  export interface UserInfo {
    uid: string;
    displayName: string | null;
    email: string | null;
    phoneNumber: string | null;
    photoURL: string | null;
    providerId: string;
    username?: string;
  }
} 