import { NextRequest } from "next/server";
import dbConnect from "@/lib/connectdb";
import Form from "@/models/form";
import { authOptions } from "@/auth";
import { getServerSession } from "next-auth";
import { recordAuditLog } from "@/lib/auditLog";
import { withErrorHandler } from "@/lib/api/async-handler";
import {
  badRequest,
  forbidden,
  notFound,
  successResponse,
  unauthorized,
} from "@/lib/api/error-handler";

export const DELETE = withErrorHandler(async (req: NextRequest) => {
  await dbConnect();
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return unauthorized("Authentication required");
  }

  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) {
    return badRequest("Form ID is required");
  }

  const form = await Form.findOne({ formId: id });
  if (!form) {
    return notFound("Form", `No form found with formId: ${id}`);
  }

  // A form's formId is public (it's embedded in third-party iframe/embed
  // code), so without this check any authenticated account — not just the
  // owning seller — could delete it.
  if (form.userId.toString() !== session.user.id) {
    return forbidden("You do not have permission to delete this form");
  }

  await form.deleteOne();

  await recordAuditLog({
    actor: session.user,
    action: "form.delete",
    targetType: "Form",
    targetId: String(form._id),
    summary: `Deleted form "${form.formName}"`,
    req,
  });

  return successResponse({
    message: "Form deleted successfully!",
    deletedForm: form,
  });
});
