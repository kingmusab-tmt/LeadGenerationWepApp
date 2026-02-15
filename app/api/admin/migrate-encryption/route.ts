import { NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/auth";
import dbConnect from "@/lib/connectdb";
import { User } from "@/models";
import { migrateEncryptedData } from "@/lib/encryption";
import {
  successResponse,
  unauthorized,
  forbidden,
  internalError,
} from "@/lib/api/error-handler";

/**
 * POST /api/admin/migrate-encryption
 * Migrates all encrypted fields from legacy IV to new random IV per encryption
 * Admin only endpoint
 */
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return unauthorized("Authentication required");
    }

    // Only allow admin users to run migration
    if (session.user.role !== "admin") {
      return forbidden("Admin access required");
    }

    await dbConnect();

    // Find all users with creditSetup data
    const usersWithCreditSetup = await User.find({
      "creditSetup.stripeSecretKey": { $exists: true, $ne: "" },
    });

    let migratedCount = 0;
    let failedCount = 0;
    const errors: string[] = [];

    for (const user of usersWithCreditSetup) {
      try {
        const updates: any = {};
        let needsUpdate = false;

        // Migrate stripeSecretKey if it exists and doesn't have new format
        if (
          user.creditSetup?.stripeSecretKey &&
          !user.creditSetup.stripeSecretKey.includes(":")
        ) {
          updates["creditSetup.stripeSecretKey"] = migrateEncryptedData(
            user.creditSetup.stripeSecretKey,
          );
          needsUpdate = true;
        }

        // Migrate stripeWebhookSecret if it exists and doesn't have new format
        if (
          user.creditSetup?.stripeWebhookSecret &&
          !user.creditSetup.stripeWebhookSecret.includes(":")
        ) {
          updates["creditSetup.stripeWebhookSecret"] = migrateEncryptedData(
            user.creditSetup.stripeWebhookSecret,
          );
          needsUpdate = true;
        }

        // Update user if any fields were migrated
        if (needsUpdate) {
          await User.findByIdAndUpdate(user._id, { $set: updates });
          migratedCount++;
        }
      } catch (error) {
        console.error(`Failed to migrate user ${user._id}:`, error);
        errors.push(`User ${user._id}: ${error}`);
        failedCount++;
      }
    }

    return successResponse({
      message: "Encryption migration completed",
      migratedCount,
      failedCount,
      totalUsers: usersWithCreditSetup.length,
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (error) {
    console.error("[POST /api/admin/migrate-encryption]", error);
    return internalError("Failed to migrate encrypted data");
  }
}
