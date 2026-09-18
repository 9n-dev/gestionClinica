import "next-auth";

declare module "next-auth" {
  interface User {
    profesionalSlug?: string | null;
  }
  interface Session {
    user: { profesionalSlug: string | null } & import("next-auth").DefaultSession["user"];
  }
}
