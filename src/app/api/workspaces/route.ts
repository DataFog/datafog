import { authOptions } from "@/config/auth";
import { prismaClient } from "@/prisma/db";
import { HttpStatusCode } from "axios";
import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";

export async function GET() {
  const session = await getServerSession(authOptions);

  if (!session || !session?.user?.email) {
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: HttpStatusCode.Unauthorized }
    );
  }

  if (session && session?.user.email) {
    const workspaces = await prismaClient.workspace.findMany({
      where: {
        WorkspaceUsers: {
          some: {
            userId: session.user.id,
          },
        },
      },
    });

    return NextResponse.json({ workspaces }, { status: HttpStatusCode.Ok });
  }

  return NextResponse.json({ success: true }, { status: HttpStatusCode.Ok });
}
