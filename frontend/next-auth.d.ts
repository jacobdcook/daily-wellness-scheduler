import "next-auth";
import "next-auth/jwt";

declare module "next-auth" {
    interface Session {
        user: {
            id: string;
            name?: string | null;
            email?: string | null;
            image?: string | null;
            isOAuth?: boolean;
        };
    }

    interface User {
        id: string;
        isOAuth?: boolean;
    }
}

declare module "next-auth/jwt" {
    interface JWT {
        id: string;
        isOAuth?: boolean;
    }
}

