import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";

const ProtectedRoutes = ["/admin", "/myreservation", "/checkout"];
// const PublicRoutes = ["/signin", "/signup"];

export async function middleware(request: NextRequest) {
  const session = await auth();
  const isLoggedIn = !!session?.user;
  const role = session?.user?.role;
  const { pathname } = request.nextUrl;

  //   kondisi jika user belum login akan diarahkan ke halaman login
  if (
    !isLoggedIn &&
    ProtectedRoutes.some((route) => pathname.startsWith(route))
  ) {
    return NextResponse.redirect(new URL("/signin", request.url));
  }
  //  kondisi jika user sudah login tetapi bukan admin akan diarahkan ke halaman utama
  if (isLoggedIn && role !== "admin" && pathname === "/admin") {
    return NextResponse.redirect(new URL("/", request.url));
  }

  //  kondisi jika user sudah login tetapi ingin mengakses signin lagi akan diarahkan ke halaman utama
  if (isLoggedIn && pathname.startsWith("/signin")) {
    return NextResponse.redirect(new URL("/", request.url));
  }
  return NextResponse.next();
}


//   kondisi untuk middleware untuk semua route kecuali api, static files, image optimizations, dan favicon.ico
export const config = {
  matcher: [
    // Exclude API routes, static files, image optimizations, and .png files
    "/((?!api|_next/static|_next/image|favicon.ico).*)",
  ],
};
