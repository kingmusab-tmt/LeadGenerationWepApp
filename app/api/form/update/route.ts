import { NextRequest } from "next/server";
import { ZodError } from "zod";
import dbConnect from "@/lib/connectdb";
import { getServerSession } from "next-auth";
import Form from "@/models/form";
import { authOptions } from "@/auth";
import { updateFormRequestSchema } from "@/lib/validation/schemas";
import { recordAuditLog } from "@/lib/auditLog";
import { withErrorHandler } from "@/lib/api/async-handler";
import {
  badRequest,
  forbidden,
  handleValidationError,
  notFound,
  successResponse,
  unauthorized,
} from "@/lib/api/error-handler";

export const PUT = withErrorHandler(async (req: NextRequest) => {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return unauthorized("Authentication required");
  }

  const body = await req.json();
  let data;
  try {
    data = await updateFormRequestSchema.parseAsync(body);
  } catch (error) {
    if (error instanceof ZodError) {
      return handleValidationError(error);
    }
    return badRequest("Invalid form data");
  }

  await dbConnect();

  const form = await Form.findOne({ formId: data.formId });
  if (!form) {
    return notFound("Form");
  }

  if (form.userId.toString() !== session.user.id) {
    return forbidden("Unauthorized to update this form");
  }

  // Only formName needs to be unique — industry is a broad shared category,
  // not a per-form identifier, so two of the seller's own forms in the same
  // industry must both remain editable.
  if (data.formName !== form.formName) {
    const duplicateCheck = await Form.findOne({
      _id: { $ne: form._id },
      userId: session.user.id,
      formName: data.formName,
    });

    if (duplicateCheck) {
      return badRequest("A form with this name already exists");
    }
  }

  form.fields = data.fields;
  form.formName = data.formName;
  if (data.leadSource !== undefined) form.leadSource = data.leadSource;
  if (data.industry !== undefined) form.industry = data.industry;
  if (data.description !== undefined) form.description = data.description;
  if (data.redirectUrl !== undefined) form.redirectUrl = data.redirectUrl;
  if (data.notificationEmail !== undefined)
    form.notificationEmail = data.notificationEmail;
  if (data.recaptchaEnabled !== undefined)
    form.recaptchaEnabled = data.recaptchaEnabled;
  if (data.styleConfig !== undefined) form.styleConfig = data.styleConfig;
  if (data.status !== undefined) form.status = data.status;
  if (data.allowedOrigins !== undefined)
    form.allowedOrigins = data.allowedOrigins;

  await form.save();

  await recordAuditLog({
    actor: session.user,
    action: "form.update",
    targetType: "Form",
    targetId: String(form._id),
    summary: `Updated form "${form.formName}"`,
    req,
  });

  return successResponse({ message: "Form updated successfully!" });
});
