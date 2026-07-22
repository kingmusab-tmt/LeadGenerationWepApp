import { NextRequest } from "next/server";
import { v4 as uuidv4 } from "uuid";
import dbConnect from "@/lib/connectdb";
import { getServerSession } from "next-auth";
import Form from "@/models/form";
import { authOptions } from "@/auth";
import { invalidateAllUserSessions } from "@/lib/cachedSession"; // PHASE 2: Cache invalidation
import { ZodError } from "zod";
import { createFormSchema } from "@/lib/validation/schemas";
import {
  successResponse,
  badRequest,
  notFound,
  conflict,
  internalError,
  handleValidationError,
  forbidden,
} from "@/lib/api/error-handler";
import { checkAndIncrementUsage } from "@/lib/subscriptionLimitsService";
import { signFormLoadToken } from "@/lib/formLoadToken";

/**
 * GET /api/form?formId=<id>
 * Get form by formId
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const formId = searchParams.get("formId");

    if (!formId) {
      return badRequest("Form ID is required");
    }

    await dbConnect();

    // This route is public/unauthenticated (it backs the embedded form
    // page), so it must not return the owning seller's raw user ID —
    // nothing on the frontend consumes it, and there's no reason for an
    // anonymous caller to receive it.
    const form = await Form.findOne({ formId })
      .select(
        "formId fields formName leadSource industry description styleConfig recaptchaEnabled redirectUrl status allowedOrigins",
      )
      .lean();
    if (!form) {
      return notFound("Form not found");
    }

    // Signed load timestamp for the public submit endpoint's anti-bot timing
    // check — see lib/formLoadToken.ts. Harmless to include for authenticated
    // builder/preview callers of this same endpoint; only the public form
    // page actually forwards it on submit.
    return successResponse({ ...form, formLoadToken: signFormLoadToken() });
  } catch (error) {
    console.error("[GET /api/form]", error);
    return internalError("Failed to fetch form");
  }
}

/**
 * POST /api/form
 * Create a new form
 */
export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return forbidden("Authentication required");
    }

    // Parse and validate request body
    let body;
    try {
      body = await request.json();
    } catch {
      return badRequest("Invalid JSON in request body");
    }

    const creatorUserId = session?.user?.id || body?.userId;
    if (!creatorUserId) {
      return badRequest("User ID is required");
    }

    let validatedData;
    try {
      validatedData = await createFormSchema.parseAsync(body);
    } catch (error) {
      if (error instanceof ZodError) {
        return handleValidationError(error);
      }
      return badRequest("Invalid form data");
    }

    await dbConnect();

    // Check subscription limit for forms
    const usageCheck = await checkAndIncrementUsage(creatorUserId, "forms", 1);
    if (!usageCheck.allowed) {
      return forbidden(
        usageCheck.message ||
          `Form limit reached (${usageCheck.currentUsage}/${usageCheck.limit}). Please upgrade your plan.`,
      );
    }

    // Check for existing form with the same name — scoped to this seller,
    // not global, so two unrelated sellers can't collide over a common name
    // like "Contact Us".
    const existingForm = await Form.findOne({
      formName: validatedData.name,
      userId: creatorUserId,
    }).lean();

    if (existingForm) {
      return conflict("Form with this name already exists");
    }

    const formId = uuidv4();
    const status = validatedData.status || "published";

    await Form.create({
      userId: creatorUserId,
      formId,
      fields: validatedData.fields,
      formName: validatedData.name,
      leadSource: validatedData.leadSource,
      industry: validatedData.industry,
      description: validatedData.description,
      redirectUrl: validatedData.redirectUrl,
      notificationEmail: validatedData.notificationEmail,
      styleConfig: validatedData.styleConfig,
      recaptchaEnabled: validatedData.recaptchaEnabled,
      status,
      allowedOrigins: validatedData.allowedOrigins,
    });

    // PHASE 2: Invalidate user cache after creating form
    await invalidateAllUserSessions(creatorUserId);

    const formUrl = `${process.env.NEXT_PUBLIC_BASE_URL}/forms/${formId}`;
    const embedCode = `<script type="text/javascript">
\twindow.addEventListener("message", function (event) {
\t\tif (event.data.hasOwnProperty("FrameHeight")) {
\t\t\tdocument.getElementById("brixcot-form-${formId}").style.height = event.data.FrameHeight+"px"        
\t\t}
\t\tif (event.data.hasOwnProperty("RedirectURL")) {
\t\t\twindow.location.href = event.data.RedirectURL;     
\t\t}
\t});
\tfunction setIframeHeight(ifrm) {
\t\tvar height = ifrm.contentWindow.postMessage("FrameHeight", "*");   
\t}
</script>
<iframe id="brixcot-form-${formId}" onload="setIframeHeight(this)" scrolling="no" style="border:0px;width:100%;overflow:hidden;" src="${formUrl}"></iframe>`;

    return successResponse(
      {
        message:
          status === "draft"
            ? "Form saved as draft — it won't accept submissions until you publish it."
            : "Form published successfully!",
        formUrl,
        embedCode,
        formId,
        status,
      },
      201,
    );
  } catch (error) {
    console.error("[POST /api/form]", error);
    return internalError("Failed to publish form");
  }
}
