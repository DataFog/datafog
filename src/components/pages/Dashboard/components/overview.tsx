"use client";

import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import { Bar, BarChart, ResponsiveContainer, XAxis, YAxis } from "recharts";

type OverviewProps = {
  data: {
    name: string;
    total: number;
  }[];
};

const chartConfig = {} satisfies ChartConfig;

export function Overview({ data }: OverviewProps) {
  return (
    <ResponsiveContainer width="100%" height={350}>
      <ChartContainer config={chartConfig}>
        <BarChart data={data}>
          <XAxis
            dataKey="name"
            stroke="red"
            fontSize={12}
            tickLine={false}
            axisLine={false}
          />
          <YAxis
            stroke="red"
            fontSize={12}
            tickLine={false}
            axisLine={false}
            tickFormatter={(value) => `$${value}`}
          />
          <Bar
            dataKey="total"
            fill="var(--chakra-colors-brand-500)"
            radius={[4, 4, 0, 0]}
          />
          <ChartTooltip
            cursor={false}
            content={<ChartTooltipContent indicator="dashed" />}
          />
        </BarChart>
      </ChartContainer>
    </ResponsiveContainer>
  );
}
