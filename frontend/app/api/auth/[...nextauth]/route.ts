import NextAuth from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import CredentialsProvider from "next-auth/providers/credentials";

const handler = NextAuth({
    providers: [
        GoogleProvider({
            clientId: process.env.GOOGLE_CLIENT_ID || "",
            clientSecret: process.env.GOOGLE_CLIENT_SECRET || "",
        }),
        CredentialsProvider({
            name: "Credentials",
            credentials: {
                email: { label: "Email", type: "text" },
                password: { label: "Password", type: "password" },
            },
            async authorize(credentials) {
                if (!credentials?.email || !credentials?.password) return null;

                try {
                    const res = await fetch("http://localhost:8000/auth/login", {
                        method: "POST",
                        body: JSON.stringify(credentials),
                        headers: { "Content-Type": "application/json" },
                    });

                    const data = await res.json();

                    if (res.ok && data.user) {
                        return {
                            id: data.user.id,
                            name: data.user.name,
                            email: data.user.email,
                        };
                    }
                    return null;
                } catch (e) {
                    console.error("Auth error:", e);
                    return null;
                }
            },
        }),
    ],
    pages: {
        signIn: "/login",
    },
    session: {
        strategy: "jwt",
        maxAge: 30 * 24 * 60 * 60, // 30 days
    },
    cookies: {
        sessionToken: {
            name: "next-auth.session-token",
            options: {
                httpOnly: true,
                sameSite: "lax",
                path: "/",
                maxAge: 30 * 24 * 60 * 60, // 30 days
            },
        },
    },
    callbacks: {
        async jwt({ token, user, account }) {
            if (user) {
                // Use email as ID for all users (Google OAuth doesn't provide id, credentials uses email)
                // Ensure we always have a string value
                token.id = user.id || user.email || token.sub || "";
                
                // Mark OAuth users - explicitly check for Google provider
                // For credentials provider, account might be undefined, so default to false
                token.isOAuth = account?.provider === "google";
            } else if (token && !token.id && token.email) {
                // Fallback: use email if id not set
                token.id = token.email;
                // Ensure isOAuth is set (default to false if not already set)
                if (token.isOAuth === undefined) {
                    token.isOAuth = false;
                }
            } else if (token && !token.id) {
                // Final fallback: use token.sub or empty string
                token.id = token.sub || "";
            }
            return token;
        },
        async session({ session, token }) {
            if (session.user) {
                // Use email as ID - this ensures all users have a unique identifier
                // @ts-ignore
                session.user.id = (token.id as string) || session.user.email || token.sub;
                // @ts-ignore
                session.user.isOAuth = token.isOAuth || false;
            }
            return session;
        },
        async redirect({ url, baseUrl }) {
            // After OAuth signin, check if user needs to set username
            if (url.includes("/api/auth/callback")) {
                // This will be handled in middleware or page
                return url;
            }
            return url.startsWith(baseUrl) ? url : baseUrl;
        },
    },
});

export { handler as GET, handler as POST };
