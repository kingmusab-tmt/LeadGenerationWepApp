import { NextRequest } from "next/server";
import { v4 as uuidv4 } from "uuid";
import dbConnect from "@/lib/connectdb";
import { getServerSession } from "next-auth";
import Form, { IForm } from "@/models/form";
import { authOptions } from "@/auth";
import {
  checkAndIncrementUsage,
  checkNumericLimit,
} from "@/lib/subscriptionLimitsService";
import { recordAuditLog } from "@/lib/auditLog";
import { withErrorHandler } from "@/lib/api/async-handler";
import {
  badRequest,
  forbidden,
  notFound,
  successResponse,
  unauthorized,
} from "@/lib/api/error-handler";

export const POST = withErrorHandler(async (req: NextRequest) => {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return unauthorized("Authentication required");
  }

  const { formId } = await req.json();
  if (!formId) {
    return badRequest("Form ID is required");
  }

  await dbConnect();

  const originalForm = await Form.findOne({ formId });
  if (!originalForm) {
    return notFound("Form", "Original form not found");
  }

  if (originalForm.userId.toString() !== session.user.id) {
    return forbidden("Unauthorized to clone this form");
  }

  // Cloning creates a new form, so it counts against the same forms-per-plan
  // limit that creating one from scratch does. Checked (read-only) before
  // the save, and only actually committed via checkAndIncrementUsage after
  // the save succeeds — so a failed clone never permanently costs the
  // seller a slot. This still leaves a narrow race between two concurrent
  // clone requests both passing this pre-check, which is an acceptable
  // trade-off against guaranteed quota loss on write failure.
  const limitCheck = await checkNumericLimit(session.user.id, "forms", "forms");
  if (!limitCheck.allowed) {
    return forbidden(
      limitCheck.message ||
        `Form limit reached (${limitCheck.currentUsage}/${limitCheck.limit}). Please upgrade your plan.`,
    );
  }

  const newFormId = uuidv4();

  // Copy the full form, not a hand-picked subset — the previous version
  // dropped description/redirectUrl/notificationEmail/recaptchaEnabled/
  // styleConfig and field placeholders, and mangled `industry` with a
  // `_copy_{timestamp}` suffix purely to dodge a since-fixed duplicate
  // check that never should have treated industry as unique. `status` and
  // `allowedOrigins` are copied too — a clone of a draft/domain-restricted
  // form should carry the same state, not silently go live/unrestricted.
  const clonedForm = new Form({
    formId: newFormId,
    userId: session.user.id,
    formName: `${originalForm.formName} (Copy)`,
    leadSource: originalForm.leadSource,
    industry: originalForm.industry,
    description: originalForm.description,
    redirectUrl: originalForm.redirectUrl,
    notificationEmail: originalForm.notificationEmail,
    recaptchaEnabled: originalForm.recaptchaEnabled,
    styleConfig: originalForm.styleConfig,
    status: originalForm.status,
    allowedOrigins: originalForm.allowedOrigins,
    fields: originalForm.fields.map((field: IForm["fields"][number]) => ({
      id: field.id,
      type: field.type,
      label: field.label,
      required: field.required,
      options: field.options,
      placeholder: field.placeholder,
    })),
  });

  await clonedForm.save();

  // Commit the usage increment now that the clone actually exists.
  await checkAndIncrementUsage(session.user.id, "forms", 1);

  await recordAuditLog({
    actor: session.user,
    action: "form.clone",
    targetType: "Form",
    targetId: String(clonedForm._id),
    summary: `Cloned form "${originalForm.formName}" as "${clonedForm.formName}"`,
    req,
  });

  return successResponse({
    message: "Form cloned successfully!",
    formId: newFormId,
    formName: clonedForm.formName,
  });
});
