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
  unauthorized,
  badRequest,
  notFound,
  conflict,
  internalError,
  handleValidationError,
} from "@/lib/api/error-handler";

/**
 * GET /api/form?formId=<id>
 * Get form by formId
 */
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return unauthorized("Authentication required");
    }

    const { searchParams } = new URL(req.url);
    const formId = searchParams.get("formId");

    if (!formId) {
      return badRequest("Form ID is required");
    }

    await dbConnect();

    const form = await Form.findOne({ formId }).lean();
    if (!form) {
      return notFound("Form not found");
    }

    return successResponse(form);
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
    if (!session?.user?.id) {
      return unauthorized("Authentication required");
    }

    // Parse and validate request body
    let body;
    try {
      body = await request.json();
    } catch (error) {
      return badRequest("Invalid JSON in request body");
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

    // Check for existing form with the same name
    const existingForm = await Form.findOne({
      formName: validatedData.name,
    }).lean();

    if (existingForm) {
      return conflict("Form with this name already exists");
    }

    const formId = uuidv4();

    const newForm = await Form.create({
      userId: session.user.id,
      formId,
      fields: validatedData.fields,
      formName: validatedData.name,
      description: validatedData.description,
      redirectUrl: validatedData.redirectUrl,
      notificationEmail: validatedData.notificationEmail,
      styleConfig: validatedData.styleConfig,
      recaptchaEnabled: validatedData.recaptchaEnabled,
    });

    // PHASE 2: Invalidate user cache after creating form
    await invalidateAllUserSessions(session.user.id);

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
        message: "Form published successfully!",
        formUrl,
        embedCode,
        formId,
      },
      201,
    );
  } catch (error) {
    console.error("[POST /api/form]", error);
    return internalError("Failed to publish form");
  }
}
