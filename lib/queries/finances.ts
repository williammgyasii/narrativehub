import "server-only";

import { getAuthUserOrNull } from "@/lib/auth/server";
import { db } from "@/lib/db";
import { events, expenses } from "@/lib/db/schema";
import { eq, and, gte, lte, desc } from "drizzle-orm";

export async function getFinancialSummary(year?: number) {
  const userId = await getAuthUserOrNull();
  if (!userId)
    return {
      totalRevenue: 0,
      totalExpenses: 0,
      profit: 0,
      taxSetAside: 0,
      monthlyRevenue: [] as { month: string; revenue: number }[],
      monthlyExpenses: [] as { month: string; expenses: number }[],
      recentExpenses: [] as typeof expenseRows,
    };

  const targetYear = year || new Date().getFullYear();
  const startDate = new Date(targetYear, 0, 1);
  const endDate = new Date(targetYear, 11, 31, 23, 59, 59);

  const paidEvents = await db
    .select()
    .from(events)
    .where(
      and(
        eq(events.userId, userId),
        eq(events.paymentStatus, "paid"),
        gte(events.eventDate, startDate),
        lte(events.eventDate, endDate)
      )
    );

  const totalRevenue = paidEvents.reduce(
    (sum, e) => sum + (e.packagePrice || 0),
    0
  );

  const expenseRows = await db
    .select()
    .from(expenses)
    .where(
      and(
        eq(expenses.userId, userId),
        gte(expenses.date, startDate),
        lte(expenses.date, endDate)
      )
    )
    .orderBy(desc(expenses.date));

  const totalExpenses = expenseRows.reduce((sum, e) => sum + e.amount, 0);

  const profit = totalRevenue - totalExpenses;
  const taxRate = 0.3;
  const taxSetAside = Math.round(Math.max(0, profit) * taxRate);

  const monthlyRevenue: { month: string; revenue: number }[] = [];
  const monthlyExpenses: { month: string; expenses: number }[] = [];
  const months = [
    "Jan", "Feb", "Mar", "Apr", "May", "Jun",
    "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
  ];

  for (let m = 0; m < 12; m++) {
    const monthRevenue = paidEvents
      .filter((e) => new Date(e.eventDate).getMonth() === m)
      .reduce((sum, e) => sum + (e.packagePrice || 0), 0);

    const monthExpense = expenseRows
      .filter((e) => new Date(e.date).getMonth() === m)
      .reduce((sum, e) => sum + e.amount, 0);

    monthlyRevenue.push({ month: months[m], revenue: monthRevenue });
    monthlyExpenses.push({ month: months[m], expenses: monthExpense });
  }

  return {
    totalRevenue,
    totalExpenses,
    profit,
    taxSetAside,
    monthlyRevenue,
    monthlyExpenses,
    recentExpenses: expenseRows.slice(0, 10),
  };
}
