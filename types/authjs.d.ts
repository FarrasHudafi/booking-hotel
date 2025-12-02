import { type DefaultSession } from "next-auth";
import { type JWT } from "next-auth/jwt";


declare module "next-auth" {
    interface Session {
        user: User & DefaultSession["user"];
    }
    interface User {
        role: string;
    }
}

declare module "next-auth/jwt" {
    interface JWT {
        role: string;
        sub: string;
    }
}

