import { getServerSession } from "next-auth";
import { authOptions } from "@/auth";
import { unauthorized, forbidden } from "@/lib/api/error-handler";
import dbConnect from "@/lib/connectdb";
import { User } from "@/models/userModel";

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
 * Verifies the request is from an admin whose adminLevel is "super" —
 * the default for every existing admin, so this only actually restricts
 * an admin that a super-admin has deliberately demoted to "standard".
 * Use for irreversible/high-impact actions: user deletion, refunds,
 * deleting a pricing tier.
 */
export async function requireSuperAdmin() {
  const { error, session } = await requireAdmin();
  if (error) return { error, session: null, actor: null };

  await dbConnect();
  const actor = await User.findOne({ email: session!.user.email }).select(
    "name email role adminLevel",
  );

  if (!actor) {
    return { error: unauthorized("Authentication required"), session: null, actor: null };
  }
  if (actor.adminLevel === "standard") {
    return {
      error: forbidden("This action requires super-admin access"),
      session: null,
      actor: null,
    };
  }

  return { error: null, session, actor };
}

/**
 * Escapes special regex characters in a string for safe use in MongoDB $regex.
 */
export function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
