"use server";
import { ReadonlyRequestCookies } from "next/dist/server/web/spec-extension/adapters/request-cookies";
import { RequestCookies } from "next/dist/server/web/spec-extension/cookies";
import { cookies } from "next/headers";
import { NextRequest } from "next/server";

export async function checkIsAuthenticated(request?: NextRequest) {
  // Get cookies from the appropriate source
  const cookieStore = request ? request.cookies : cookies();
  const resolvedCookies =
    typeof (cookieStore as Promise<unknown>).then === "function"
      ? await (cookieStore as Promise<ReadonlyRequestCookies>)
      : (cookieStore as RequestCookies);
  const sessionToken = resolvedCookies.get("sessionToken")?.value;

  if (!sessionToken) {
    return {
      isAuthenticated: false,
      role: null,
      isSubActive: false,
    };
  }

  try {
    // Verify the session token with your backend
    const response = await fetch(`${process.env.API_BASE_URL}/auth/verify`, {
      headers: {
        Authorization: `Bearer ${sessionToken}`,
      },
    });

    if (!response.ok) {
      return {
        isAuthenticated: false,
        role: null,
        isSubActive: false,
      };
    }

    const data = await response.json();
    return {
      isAuthenticated: true,
      role: data.role,
      isSubActive: data.isSubActive,
    };
  } catch (error) {
    console.error("Authentication check failed:", error);
    return {
      isAuthenticated: false,
      role: null,
      isSubActive: false,
    };
  }
}
