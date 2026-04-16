import { authOptions } from "@/auth";
import { getServerSession } from "next-auth";
import { User } from "@/models";
import dbConnect from "@/lib/connectdb";
import { NextRequest } from "next/server";
import { z, ZodError } from "zod";
import {
  successResponse,
  unauthorized,
  badRequest,
  notFound,
  conflict,
  internalError,
  handleValidationError,
} from "@/lib/api/error-handler";
import { mongoIdParamSchema } from "@/lib/validation/schemas";
import { invalidateUserCache, invalidateUserSessions } from "@/lib/memoryCache";

export const dynamic = "force-dynamic";

// Zod schema for user profile updates
const updateUserProfileSchema = z.object({
  _id: mongoIdParamSchema.optional(),
  name: z
    .string()
    .min(1, "Name cannot be empty")
    .max(100, "Name cannot exceed 100 characters")
    .regex(
      /^[a-zA-Z\u00C0-\u024F\u1E00-\u1EFF\s'-]+$/,
      "Name can only contain letters, spaces, hyphens, and apostrophes",
    )
    .optional(),
  mobileNumber: z
    .string()
    .regex(/^[\+]?[0-9\s\-\(\)]+$/, "Please enter a valid phone number")
    .min(10, "Phone number must be at least 10 digits")
    .max(15, "Phone number cannot exceed 15 digits")
    .optional(),
  businessName: z
    .string()
    .max(150, "Business name cannot exceed 150 characters")
    .optional(),
  businessEmail: z
    .string()
    .email("Please enter a valid business email")
    .optional(),
  businessPhone: z
    .string()
    .regex(
      /^[\+]?[0-9\s\-\(\)]+$/,
      "Please enter a valid business phone number",
    )
    .min(10, "Business phone number must be at least 10 digits")
    .max(15, "Business phone number cannot exceed 15 digits")
    .optional(),
  businessWebsite: z
    .string()
    .url("Please enter a valid business website URL")
    .optional(),
  companyDescription: z
    .string()
    .max(1000, "Company description cannot exceed 1000 characters")
    .optional(),
  industryNiche: z
    .string()
    .max(120, "Industry/Niche cannot exceed 120 characters")
    .optional(),
  businessAddress: z
    .object({
      addressLine1: z.string().max(150).optional(),
      addressLine2: z.string().max(150).optional(),
      city: z.string().max(80).optional(),
      state: z.string().max(80).optional(),
      country: z.string().max(80).optional(),
      postCode: z.string().max(20).optional(),
    })
    .optional(),
});

/**
 * PUT /api/users/profile
 * Update user profile information
 */
export async function PUT(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return unauthorized("Authentication required");
    }
    const userEmail = session.user.email ?? "";
    if (!userEmail) {
      return badRequest("Missing user email in session");
    }

    // Parse and validate request body
    let body;
    try {
      body = await req.json();
    } catch (error) {
      return badRequest("Invalid JSON in request body");
    }

    // Validate input with Zod
    let validatedData;
    try {
      validatedData = await updateUserProfileSchema.parseAsync(body);
    } catch (error) {
      if (error instanceof ZodError) {
        return handleValidationError(error);
      }
      return badRequest("Invalid user data");
    }

    // Check if at least one field is being updated
    const hasFieldsToUpdate =
      validatedData.name ||
      validatedData.mobileNumber ||
      validatedData.businessName ||
      validatedData.businessEmail ||
      validatedData.businessPhone ||
      validatedData.businessWebsite ||
      validatedData.companyDescription ||
      validatedData.industryNiche ||
      validatedData.businessAddress;
    if (!hasFieldsToUpdate) {
      return badRequest("At least one field must be provided for update");
    }

    await dbConnect();

    // Determine filter based on _id or email from session
    let filter: { _id?: string; email: string } = { email: userEmail };
    if (validatedData._id) {
      filter = { _id: validatedData._id, email: userEmail };
    }

    // Find the user first
    const user = await User.findOne(filter).select("_id");
    if (!user) {
      return notFound("User not found");
    }

    // Prepare update object
    const updateData: Record<string, unknown> = {};
    if (validatedData.name) {
      // Capitalize first letter of each word
      updateData.name = validatedData.name.replace(
        /\w\S*/g,
        (txt: string) =>
          txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase(),
      );
    }
    if (validatedData.mobileNumber) {
      // Clean phone number: remove all non-digits except leading +
      updateData.mobileNumber = validatedData.mobileNumber.replace(
        /[^\d+]/g,
        "",
      );
    }
    if (validatedData.businessName) {
      updateData.businessName = validatedData.businessName;
    }
    if (validatedData.businessEmail) {
      updateData.businessEmail = validatedData.businessEmail.toLowerCase();
    }
    if (validatedData.businessPhone) {
      updateData.businessPhone = validatedData.businessPhone.replace(
        /[^\d+]/g,
        "",
      );
    }
    if (validatedData.businessWebsite) {
      updateData.businessWebsite = validatedData.businessWebsite;
    }
    if (validatedData.companyDescription) {
      updateData.companyDescription = validatedData.companyDescription;
    }
    if (validatedData.industryNiche) {
      updateData.industryNiche = validatedData.industryNiche;
    }
    if (validatedData.businessAddress) {
      updateData.businessAddress = validatedData.businessAddress;
    }

    // Update the user
    await User.updateOne(filter, { $set: updateData });

    // Invalidate cache for this user
    await invalidateUserCache(`user:${String(user._id)}`);
    await invalidateUserSessions(String(user._id));

    return successResponse({
      message: "User updated successfully",
      updatedFields: Object.keys(updateData),
    });
  } catch (error) {
    console.error("[PUT /api/users/profile]", error);
    return internalError("Failed to update user profile");
  }
}

/**
 * PATCH /api/updateuser
 * Partially update user profile information
 */
export async function PATCH(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return unauthorized("Authentication required");
    }
    const userEmail = session.user.email ?? "";
    if (!userEmail) {
      return badRequest("Missing user email in session");
    }

    // Parse and validate request body
    let body;
    try {
      body = await req.json();
    } catch (error) {
      return badRequest("Invalid JSON in request body");
    }

    // Validate input with Zod
    let validatedData;
    try {
      validatedData = await updateUserProfileSchema.parseAsync(body);
    } catch (error) {
      if (error instanceof ZodError) {
        return handleValidationError(error);
      }
      return badRequest("Invalid user data");
    }

    // Check if at least one field is being updated
    const hasFieldsToUpdate =
      validatedData.name ||
      validatedData.mobileNumber ||
      validatedData.businessName ||
      validatedData.businessEmail ||
      validatedData.businessPhone ||
      validatedData.businessWebsite ||
      validatedData.companyDescription ||
      validatedData.industryNiche ||
      validatedData.businessAddress;
    if (!hasFieldsToUpdate) {
      return badRequest("At least one field must be provided for update");
    }

    await dbConnect();

    // Determine filter
    let filter: { _id?: string; email: string } = { email: userEmail };
    if (validatedData._id) {
      filter = { _id: validatedData._id, email: userEmail };
    }

    // Find the user first
    const user = await User.findOne(filter).select("_id");
    if (!user) {
      return notFound("User not found");
    }

    // Prepare update object
    const updateData: Record<string, unknown> = {};
    if (validatedData.name) {
      updateData.name = validatedData.name.replace(
        /\w\S*/g,
        (txt: string) =>
          txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase(),
      );
    }
    if (validatedData.mobileNumber) {
      updateData.mobileNumber = validatedData.mobileNumber.replace(
        /[^\d+]/g,
        "",
      );
    }
    if (validatedData.businessName) {
      updateData.businessName = validatedData.businessName;
    }
    if (validatedData.businessEmail) {
      updateData.businessEmail = validatedData.businessEmail.toLowerCase();
    }
    if (validatedData.businessPhone) {
      updateData.businessPhone = validatedData.businessPhone.replace(
        /[^\d+]/g,
        "",
      );
    }
    if (validatedData.businessWebsite) {
      updateData.businessWebsite = validatedData.businessWebsite;
    }
    if (validatedData.companyDescription) {
      updateData.companyDescription = validatedData.companyDescription;
    }
    if (validatedData.industryNiche) {
      updateData.industryNiche = validatedData.industryNiche;
    }
    if (validatedData.businessAddress) {
      updateData.businessAddress = validatedData.businessAddress;
    }

    // Update the user
    await User.updateOne(filter, { $set: updateData });

    // Invalidate cache for this user
    await invalidateUserCache(`user:${String(user._id)}`);
    await invalidateUserSessions(String(user._id));

    return successResponse({
      message: "User updated successfully",
      updatedFields: Object.keys(updateData),
    });
  } catch (error) {
    console.error("[PATCH /api/users/profile]", error);
    return internalError("Failed to update user profile");
  }
}
