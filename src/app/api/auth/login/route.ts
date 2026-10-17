import { NextRequest, NextResponse } from "next/server";
import { authenticateUser, COOKIE_NAME } from "@/lib/auth";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { identifier, password, rememberMe } = body;

    if (!identifier || !password) {
      return NextResponse.json(
        { error: "Email/Phone and password are required." },
        { status: 400 }
      );
    }

    const authResult = await authenticateUser(identifier, password, Boolean(rememberMe));

    if (!authResult.success) {
      return NextResponse.json(
        {
          error: authResult.error,
          isLocked: authResult.isLocked,
          lockoutMinutes: authResult.lockoutMinutes,
        },
        { status: 401 }
      );
    }

    const response = NextResponse.json({
      success: true,
      user: authResult.user,
      message: "Login successful.",
    });

    // Set secure HTTP-only session cookie
    response.cookies.set({
      name: COOKIE_NAME,
      value: authResult.token!,
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: authResult.maxAge,
    });

    return response;
  } catch (error) {
    console.error("Login API error:", error);
    return NextResponse.json(
      { error: "An unexpected error occurred during login. Please try again." },
      { status: 500 }
    );
  }
}
