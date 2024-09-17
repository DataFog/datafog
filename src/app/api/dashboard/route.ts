import { authOptions } from "@/config/auth";
import { prismaClient } from "@/prisma/db";
import { HttpStatusCode } from "axios";
import { getServerSession } from "next-auth";
import { NextRequest, NextResponse } from "next/server";

export type DashboardData = {
  revenue: {
    value: string;
    increase: string;
  };
  subscriptions: {
    value: string;
    increase: string;
  };
  orders: {
    value: string;
    increase: string;
  };
  activeNow: {
    value: string;
    increase: string;
  };
  charts: {
    name: string;
    total: number;
  }[];
  trend: {
    date: string;
    total: number;
  }[];
};

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);

  if (!session || !session?.user?.email) {
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: HttpStatusCode.Unauthorized }
    );
  }

  try {
    // Fetch dashboard data here
    // For example:
    /*
    const sales = await prismaClient.sales.findMany();
    */

    // You can add more queries to fetch additional dashboard data

    const data: DashboardData = {
      revenue: {
        value: "45,231.93",
        increase: "+20.1%",
      },
      subscriptions: {
        value: "+2,351",
        increase: "+180%",
      },
      orders: {
        value: "+12,236",
        increase: "+19%",
      },
      activeNow: {
        value: "+578",
        increase: "+201",
      },
      charts: [
        {
          name: "Jan",
          total: Math.floor(Math.random() * 5000) + 1000,
        },
        {
          name: "Feb",
          total: Math.floor(Math.random() * 5000) + 1000,
        },
        {
          name: "Mar",
          total: Math.floor(Math.random() * 5000) + 1000,
        },
        {
          name: "Apr",
          total: Math.floor(Math.random() * 5000) + 1000,
        },
        {
          name: "May",
          total: Math.floor(Math.random() * 5000) + 1000,
        },
        {
          name: "Jun",
          total: Math.floor(Math.random() * 5000) + 1000,
        },
        {
          name: "Jul",
          total: Math.floor(Math.random() * 5000) + 1000,
        },
        {
          name: "Aug",
          total: Math.floor(Math.random() * 5000) + 1000,
        },
        {
          name: "Sep",
          total: Math.floor(Math.random() * 5000) + 1000,
        },
        {
          name: "Oct",
          total: Math.floor(Math.random() * 5000) + 1000,
        },
        {
          name: "Nov",
          total: Math.floor(Math.random() * 5000) + 1000,
        },
        {
          name: "Dec",
          total: Math.floor(Math.random() * 5000) + 1000,
        },
      ],
      trend: [
        {
          date: "2024-01-01",
          total: Math.floor(Math.random() * 5000) + 1000,
        },
        {
          date: "2024-02-01",
          total: Math.floor(Math.random() * 5000) + 1000,
        },
        {
          date: "2024-03-01",
          total: Math.floor(Math.random() * 5000) + 1000,
        },
        {
          date: "2024-04-01",
          total: Math.floor(Math.random() * 5000) + 1000,
        },
        {
          date: "2024-05-01",
          total: Math.floor(Math.random() * 5000) + 1000,
        },
        {
          date: "2024-06-01",
          total: Math.floor(Math.random() * 5000) + 1000,
        },
        {
          date: "2024-07-01",
          total: Math.floor(Math.random() * 5000) + 1000,
        },
        {
          date: "2024-08-01",
          total: Math.floor(Math.random() * 5000) + 1000,
        },
        {
          date: "2024-09-01",
          total: Math.floor(Math.random() * 5000) + 1000,
        },
        {
          date: "2024-10-01",
          total: Math.floor(Math.random() * 5000) + 1000,
        },
        {
          date: "2024-11-01",
          total: Math.floor(Math.random() * 5000) + 1000,
        },
        {
          date: "2024-12-01",
          total: Math.floor(Math.random() * 5000) + 1000,
        },
      ],
    };

    return NextResponse.json({ data }, { status: HttpStatusCode.Ok });
  } catch (error) {
    console.error("Error fetching dashboard data:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: HttpStatusCode.InternalServerError }
    );
  }
}
