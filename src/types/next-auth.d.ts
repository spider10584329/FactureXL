import { Role } from "@prisma/client";
import { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role: Role;
      companyId: string | null;
    } & DefaultSession["user"];
  }

  interface User {
    id: string;
    email: string;
    name: string | null;
    role: Role;
    companyId: string | null;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    role: Role;
    companyId: string | null;
  }
}
