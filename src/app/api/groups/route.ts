import { NextResponse } from "next/server";

// Temporary endpoint to prevent errors - groups have been removed
// TODO: Remove all group references from UI components
export async function GET() {
  return NextResponse.json([]);
}
