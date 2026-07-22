import type { Metadata } from "next";
import dbConnect from "@/lib/connectdb";
import Form from "@/models/form";
import FormPageClient from "./FormPageClient";

interface PageProps {
  params: Promise<{ formId: string }>;
}

async function getFormMeta(formId: string) {
  await dbConnect();
  return Form.findOne({ formId })
    .select("formName description status")
    .lean<{ formName?: string; description?: string; status?: string } | null>();
}

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { formId } = await params;
  const form = await getFormMeta(formId);

  if (!form) {
    return { title: "Form not found" };
  }

  const title = form.formName || "Submit your information";
  const description =
    form.description ||
    "Fill out this form to submit your information — it only takes a moment.";

  return {
    title,
    description,
    // A form saved as a draft isn't meant for public traffic yet, so it
    // shouldn't show up in search results even though the URL is reachable.
    robots:
      form.status === "draft"
        ? { index: false, follow: false }
        : { index: true, follow: true },
    openGraph: {
      title,
      description,
    },
  };
}

export default async function FormPage({ params }: PageProps) {
  const { formId } = await params;
  return <FormPageClient formId={formId} />;
}
