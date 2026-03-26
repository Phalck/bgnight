import 'next-auth';

declare module 'next-auth' {
  interface Session {
    user: {
      id: string;
      email: string;
      name?: string | null;
      role: string;
      mustChangePassword: boolean;
      allowPlayerLinking: boolean;
      showEmailInSearch: boolean;
    };
  }
  interface User {
    id: string;
    email: string;
    name?: string | null;
    role: string;
    mustChangePassword: boolean;
    allowPlayerLinking: boolean;
    showEmailInSearch: boolean;
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    id: string;
    role: string;
    mustChangePassword: boolean;
    allowPlayerLinking: boolean;
    showEmailInSearch: boolean;
  }
}
