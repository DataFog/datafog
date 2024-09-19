import { prismaClient } from "@/prisma/db";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const todos = await prismaClient.todo.findMany();
    return NextResponse.json({ todos });
  } catch (error) {
    console.error("Error fetching todos:", error);
    return NextResponse.json(
      { error: "Failed to fetch todos" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const { text } = await request.json();

    if (!text || typeof text !== "string") {
      return NextResponse.json({ error: "Invalid todo text" }, { status: 400 });
    }

    const newTodo = await prismaClient.todo.create({
      data: {
        text,
        isCompleted: false,
      },
    });

    return NextResponse.json({ todo: newTodo }, { status: 201 });
  } catch (error) {
    console.error("Error creating todo:", error);
    return NextResponse.json(
      { error: "Failed to create todo" },
      { status: 500 }
    );
  }
}

export async function PUT(request: Request) {
  try {
    const { id, text, isCompleted } = await request.json();

    if (!id || typeof id !== "string") {
      return NextResponse.json({ error: "Invalid todo id" }, { status: 400 });
    }

    if (text !== undefined && typeof text !== "string") {
      return NextResponse.json({ error: "Invalid todo text" }, { status: 400 });
    }

    if (isCompleted !== undefined && typeof isCompleted !== "boolean") {
      return NextResponse.json(
        { error: "Invalid isCompleted value" },
        { status: 400 }
      );
    }

    const updatedTodo = await prismaClient.todo.update({
      where: { id },
      data: {
        ...(text !== undefined && { text }),
        ...(isCompleted !== undefined && { isCompleted }),
      },
    });

    return NextResponse.json({ todo: updatedTodo });
  } catch (error) {
    console.error("Error updating todo:", error);
    return NextResponse.json(
      { error: "Failed to update todo" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request) {
  try {
    const { id } = await request.json();

    if (!id || typeof id !== "string") {
      return NextResponse.json({ error: "Invalid todo id" }, { status: 400 });
    }

    await prismaClient.todo.delete({
      where: { id },
    });

    return NextResponse.json({ message: "Todo deleted successfully" });
  } catch (error) {
    console.error("Error deleting todo:", error);
    return NextResponse.json(
      { error: "Failed to delete todo" },
      { status: 500 }
    );
  }
}
