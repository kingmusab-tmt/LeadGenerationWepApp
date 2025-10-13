import { authOptions } from "@/auth";
import { getServerSession } from "next-auth";
import { User } from "@/models/user";
import dbConnect from "@/lib/connectdb";
import { NextRequest } from "next/server";

export const dynamic = "force-dynamic";

// Allowed fields that can be updated by the user
const ALLOWED_UPDATE_FIELDS = ["name", "username", "mobileNumber"];

// Validation rules for each field
const VALIDATION_RULES = {
  name: {
    minLength: 1,
    maxLength: 100,
    pattern: /^[a-zA-Z\u00C0-\u024F\u1E00-\u1EFF\s'-]+$/, // Allows letters, spaces, hyphens, apostrophes
    message: "Name can only contain letters, spaces, hyphens, and apostrophes",
  },
  username: {
    minLength: 3,
    maxLength: 30,
    pattern: /^[a-zA-Z0-9_]+$/, // Alphanumeric and underscores
    message: "Username can only contain letters, numbers, and underscores",
  },
  mobileNumber: {
    minLength: 10,
    maxLength: 15,
    pattern: /^[\+]?[0-9\s\-\(\)]+$/, // International phone number format
    message: "Please enter a valid phone number",
  },
};

interface ValidationResult {
  isValid: boolean;
  errors: string[];
  sanitizedData: any;
}

function validateUpdateData(data: any): ValidationResult {
  const errors: string[] = [];
  const sanitized: any = {};

  // Check if data is an object
  if (typeof data !== "object" || data === null) {
    return {
      isValid: false,
      errors: ["Invalid data format"],
      sanitizedData: {},
    };
  }

  // Validate each field
  ALLOWED_UPDATE_FIELDS.forEach((field) => {
    if (data[field] !== undefined && data[field] !== null) {
      const value = String(data[field]).trim();
      const rules = VALIDATION_RULES[field as keyof typeof VALIDATION_RULES];

      // Check if field exists in validation rules
      if (!rules) {
        errors.push(`Field '${field}' is not configurable for validation`);
        return;
      }

      // Validate length
      if (value.length < rules.minLength) {
        errors.push(
          `${field} must be at least ${rules.minLength} characters long`
        );
        return;
      }

      if (value.length > rules.maxLength) {
        errors.push(`${field} must be less than ${rules.maxLength} characters`);
        return;
      }

      // Validate pattern
      if (!rules.pattern.test(value)) {
        errors.push(rules.message);
        return;
      }

      // Additional specific validations
      switch (field) {
        case "name":
          // Check for consecutive special characters
          if (/(\s{2,}|[-']{2,})/.test(value)) {
            errors.push("Name contains invalid consecutive characters");
            return;
          }
          // Capitalize first letter of each word
          sanitized[field] = value.replace(
            /\w\S*/g,
            (txt: string) =>
              txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase()
          );
          break;

        case "username":
          // Check if username starts with a letter or number
          if (!/^[a-zA-Z0-9]/.test(value)) {
            errors.push("Username must start with a letter or number");
            return;
          }
          sanitized[field] = value.toLowerCase(); // Convert to lowercase
          break;

        case "mobileNumber":
          // Remove all non-digit characters except + for storage
          const cleanedNumber = value.replace(/[^\d+]/g, "");
          // Validate the cleaned number
          if (cleanedNumber.startsWith("+")) {
            // International number: + followed by 10-14 digits
            if (!/^\+\d{10,14}$/.test(cleanedNumber)) {
              errors.push("Invalid international phone number format");
              return;
            }
          } else {
            // Local number: 10-15 digits
            if (!/^\d{10,15}$/.test(cleanedNumber)) {
              errors.push("Invalid phone number format");
              return;
            }
          }
          sanitized[field] = cleanedNumber;
          break;

        default:
          sanitized[field] = value;
      }
    }
  });

  // Check if any valid fields were provided
  if (Object.keys(sanitized).length === 0) {
    errors.push("No valid fields to update");
  }

  return {
    isValid: errors.length === 0,
    errors,
    sanitizedData: sanitized,
  };
}

function validateUserId(_id: string | undefined): boolean {
  if (!_id) return true; // _id is optional

  // MongoDB ObjectId validation (24 hex characters)
  return /^[0-9a-fA-F]{24}$/.test(_id);
}

async function checkUsernameAvailability(
  username: string,
  currentUserId?: string
): Promise<boolean> {
  if (!username) return true;

  const query: any = { username };
  if (currentUserId) {
    query._id = { $ne: currentUserId }; // Exclude current user
  }

  const existingUser = await User.findOne(query);
  return !existingUser; // Return true if username is available
}

export async function PUT(req: NextRequest) {
  try {
    await dbConnect();
    const data = await req.json();
    const session = await getServerSession(authOptions);

    if (!session) {
      return Response.json({
        message: "Unauthorized",
        status: 401,
        success: false,
      });
    }

    // Validate user ID format if provided
    if (data._id && !validateUserId(data._id)) {
      return Response.json({
        message: "Invalid user ID format",
        status: 400,
        success: false,
      });
    }

    // Validate and sanitize input data
    const validationResult = validateUpdateData(data);
    if (!validationResult.isValid) {
      return Response.json({
        message: "Validation failed",
        errors: validationResult.errors,
        status: 400,
        success: false,
      });
    }

    // Check username availability if username is being updated
    if (validationResult.sanitizedData.username) {
      let filterForUsernameCheck = {};
      if (data._id) {
        filterForUsernameCheck = { _id: data._id };
      } else {
        const email = session?.user?.email;
        filterForUsernameCheck = { email };
      }

      const currentUser = await User.findOne(filterForUsernameCheck);
      if (!currentUser) {
        return Response.json({
          message: "User not found",
          status: 404,
          success: false,
        });
      }

      const currentUserId = currentUser._id
        ? String((currentUser as any)._id)
        : undefined;
      const isUsernameAvailable = await checkUsernameAvailability(
        validationResult.sanitizedData.username,
        currentUserId
      );

      if (!isUsernameAvailable) {
        return Response.json({
          message: "Username already taken",
          status: 409,
          success: false,
        });
      }
    }

    let filter = {};
    if (data._id) {
      // Additional security: ensure the _id belongs to the current user
      const email = session?.user?.email;
      filter = { _id: data._id, email };
    } else {
      const email = session?.user?.email;
      filter = { email };
    }

    // Find the user by email or _id (with email verification)
    const user = await User.findOne(filter);

    if (!user) {
      return Response.json({
        message: "User not found",
        status: 404,
        success: false,
      });
    }

    // Update only the allowed and validated fields
    await User.updateOne(filter, { $set: validationResult.sanitizedData });

    return Response.json({
      message: "User updated successfully",
      status: 200,
      success: true,
    });
  } catch (error) {
    console.error("Update error:", error);
    return Response.json({
      message: "Internal server error",
      status: 500,
      success: false,
    });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    await dbConnect();
    const data = await req.json();
    const session = await getServerSession(authOptions);

    if (!session) {
      return Response.json({
        message: "Unauthorized",
        status: 401,
        success: false,
      });
    }

    // Validate user ID format if provided
    if (data._id && !validateUserId(data._id)) {
      return Response.json({
        message: "Invalid user ID format",
        status: 400,
        success: false,
      });
    }

    // Validate and sanitize input data
    const validationResult = validateUpdateData(data);
    if (!validationResult.isValid) {
      return Response.json({
        message: "Validation failed",
        errors: validationResult.errors,
        status: 400,
        success: false,
      });
    }

    // Check username availability if username is being updated
    if (validationResult.sanitizedData.username) {
      let filterForUsernameCheck = {};
      if (data._id) {
        filterForUsernameCheck = { _id: data._id };
      } else {
        const email = session?.user?.email;
        filterForUsernameCheck = { email };
      }

      const currentUser = await User.findOne(filterForUsernameCheck);
      if (!currentUser) {
        return Response.json({
          message: "User not found",
          status: 404,
          success: false,
        });
      }

      const currentUserId = (currentUser as any)._id
        ? String((currentUser as any)._id)
        : undefined;
      const isUsernameAvailable = await checkUsernameAvailability(
        validationResult.sanitizedData.username,
        currentUserId
      );

      if (!isUsernameAvailable) {
        return Response.json({
          message: "Username already taken",
          status: 409,
          success: false,
        });
      }
    }

    let filter = {};
    if (data._id) {
      // Additional security: ensure the _id belongs to the current user
      const email = session?.user?.email;
      filter = { _id: data._id, email };
    } else {
      const email = session?.user?.email;
      filter = { email };
    }

    // Find the user by email or _id (with email verification)
    const user = await User.findOne(filter);

    if (!user) {
      return Response.json({
        message: "User not found",
        status: 404,
        success: false,
      });
    }

    // Update only the allowed and validated fields
    await User.updateOne(filter, { $set: validationResult.sanitizedData });

    return Response.json({
      message: "User updated successfully",
      status: 200,
      success: true,
      updatedFields: Object.keys(validationResult.sanitizedData),
    });
  } catch (error) {
    console.error("Update error:", error);
    return Response.json({
      message: "Internal server error",
      status: 500,
      success: false,
    });
  }
}
