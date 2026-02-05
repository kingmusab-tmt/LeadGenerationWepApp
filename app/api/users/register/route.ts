import { NextRequest } from "next/server";
import dbConnect from "@/lib/connectdb";
import { User } from "@/models";
import { ZodError } from "zod";
import { signUpSchema } from "@/lib/validation/schemas";
import {
  successResponse,
  badRequest,
  forbidden,
  internalError,
  handleValidationError,
  conflict,
} from "@/lib/api/error-handler";

/**
 * POST /api/signup
 * Create a new user account
 */
export async function POST(req: NextRequest) {
  try {
    // Parse and validate request body
    let body;
    try {
      body = await req.json();
    } catch (error) {
      return badRequest("Invalid JSON in request body");
    }

    let validatedData;
    try {
      validatedData = await signUpSchema.parseAsync(body);
    } catch (error) {
      if (error instanceof ZodError) {
        return handleValidationError(error);
      }
      return badRequest("Invalid signup data");
    }

    await dbConnect();

    // Check if user already exists
    const existingUser = await User.findOne({
      email: validatedData.email,
    }).lean();

    if (existingUser) {
      return conflict("User with this email already exists");
    }

    // Create a new user
    const newUser = new User({
      email: validatedData.email,
      name: validatedData.name,
      password: validatedData.password,
      userType: validatedData.userType,
      provider: "email",
      status: "active",
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    await newUser.save();

    return successResponse(
      {
        message: "Signup successful",
        userId: newUser._id,
      },
      201,
    );
  } catch (error) {
    console.error("[POST /api/users/register]", error);
    return internalError("Failed to create user account");
  }
}
