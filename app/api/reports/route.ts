import { NextRequest, NextResponse } from "next/server";
import { Report } from "@/models/user";
import dbConnect from "@/lib/connectdb";

export async function GET(req: NextRequest) {
  await dbConnect();

  const { searchParams } = new URL(req.url);
  const reportId = searchParams.get("id");

  try {
    if (reportId) {
      // Fetch a single report by ID
      const report = await Report.findById(reportId);
      if (!report) {
        return NextResponse.json(
          { message: "Report not found" },
          { status: 404 }
        );
      }
      return NextResponse.json(report, { status: 200 });
    } else {
      // Fetch all reports
      const reports = await Report.find();
      return NextResponse.json(reports, { status: 200 });
    }
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to fetch reports." },
      { status: 500 }
    );
  }
}
