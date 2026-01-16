import { withAuth } from "next-auth/middleware";

export default withAuth({
    callbacks: {
        authorized({ token }) {
            return !!token;
        },
    },
});

export const config = {
    matcher: ["/((?!login|signup|api|backend|_next/static|_next/image|favicon.ico).*)"],
};
