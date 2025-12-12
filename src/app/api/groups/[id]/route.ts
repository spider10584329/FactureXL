import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const articleSchema = z.object({
  title: z.string().min(1),
  price: z.number(),
  code: z.string().optional(),
  internRef: z.string().optional(),
  unite: z.string().optional(),
  description: z.string().optional(),
  tax: z.string().optional(),
});

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const group = await prisma.group.findUnique({
      where: { id: params.id },
      include: {
        articles: true,
      },
    });

    if (!group) {
      return NextResponse.json({ error: "Group not found" }, { status: 404 });
    }

    return NextResponse.json(group);
  } catch (error) {
    console.error("Error fetching group:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();

    const group = await prisma.group.update({
      where: { id: params.id },
      data: {
        name: body.name,
        account: body.account,
        color: body.color,
      },
      include: {
        articles: true,
      },
    });

    return NextResponse.json(group);
  } catch (error) {
    console.error("Error updating group:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await prisma.group.delete({
      where: { id: params.id },
    });

    return NextResponse.json({ message: "Group deleted successfully" });
  } catch (error) {
    console.error("Error deleting group:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// Add article to group
export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { action, article, articleId } = body;

    if (action === "add-article") {
      const validatedArticle = articleSchema.parse(article);
      const newArticle = await prisma.article.create({
        data: {
          ...validatedArticle,
          groupId: params.id,
        },
      });
      return NextResponse.json(newArticle, { status: 201 });
    }

    if (action === "update-article" && articleId) {
      const validatedArticle = articleSchema.parse(article);
      const updatedArticle = await prisma.article.update({
        where: { id: articleId },
        data: validatedArticle,
      });
      return NextResponse.json(updatedArticle);
    }

    if (action === "delete-article" && articleId) {
      await prisma.article.delete({
        where: { id: articleId },
      });
      return NextResponse.json({ message: "Article deleted successfully" });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      // Format Zod errors into a readable message
      const errorMessage = error.errors
        .map((err) => `${err.path.join('.')}: ${err.message}`)
        .join(', ');
      return NextResponse.json({ error: errorMessage }, { status: 400 });
    }
    console.error("Error managing article:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
