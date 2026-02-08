import { getServerSession } from "next-auth";
import { authOptions } from "@/auth";
import { unauthorized, forbidden } from "@/lib/api/error-handler";

/**
 * Verifies the request is from an authenticated admin user.
 * Returns the session if valid, or a NextResponse error if not.
 */
export async function requireAdmin() {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return { error: unauthorized("Authentication required"), session: null };
  }
  if (session.user.role !== "admin") {
    return { error: forbidden("Admin access required"), session: null };
  }
  return { error: null, session };
}

/**
 * Escapes special regex characters in a string for safe use in MongoDB $regex.
 */
export function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
