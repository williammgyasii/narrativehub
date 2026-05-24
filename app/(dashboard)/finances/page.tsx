import { DollarSign, TrendingUp, TrendingDown, Landmark, Plus } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatCard } from "@/components/stat-card";
import { PageHeader } from "@/components/page-header";
import { getFinancialSummary } from "@/lib/queries/finances";
import { formatCurrency, formatDate } from "@/lib/format";
import { AddExpenseDialog } from "./add-expense-dialog";

const categoryLabels: Record<string, string> = {
  gear_rental: "Gear Rental",
  travel: "Travel",
  software: "Software",
  insurance: "Insurance",
  marketing: "Marketing",
  other: "Other",
};

export default async function FinancesPage() {
  const summary = await getFinancialSummary();

  return (
    <div className="space-y-6">
      <PageHeader
        title="Finances"
        description={`${new Date().getFullYear()} financial overview`}
      >
        <AddExpenseDialog />
      </PageHeader>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Revenue"
          value={formatCurrency(summary.totalRevenue)}
          subtitle="From paid events"
          icon={TrendingUp}
        />
        <StatCard
          title="Expenses"
          value={formatCurrency(summary.totalExpenses)}
          subtitle="All categories"
          icon={TrendingDown}
        />
        <StatCard
          title="Profit"
          value={formatCurrency(summary.profit)}
          subtitle="Revenue minus expenses"
          icon={DollarSign}
          className={
            summary.profit >= 0 ? "border-emerald-500/20" : "border-red-500/20"
          }
        />
        <StatCard
          title="Tax Set-Aside"
          value={formatCurrency(summary.taxSetAside)}
          subtitle="30% of profit"
          icon={Landmark}
        />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Monthly Revenue */}
        <Card className="border-white/10 bg-surface">
          <CardHeader className="pb-3">
            <CardTitle className="font-heading text-lg text-white">
              Monthly Revenue
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {summary.monthlyRevenue.map((m) => (
                <div key={m.month} className="flex items-center gap-3">
                  <span className="w-8 text-xs text-zinc-500">{m.month}</span>
                  <div className="flex-1 h-5 rounded-full bg-white/5 overflow-hidden">
                    {m.revenue > 0 && summary.totalRevenue > 0 && (
                      <div
                        className="h-full rounded-full bg-gold/40"
                        style={{
                          width: `${Math.max(2, (m.revenue / summary.totalRevenue) * 100)}%`,
                        }}
                      />
                    )}
                  </div>
                  <span className="w-20 text-right text-xs text-zinc-400">
                    {m.revenue > 0 ? formatCurrency(m.revenue) : "—"}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Recent Expenses */}
        <Card className="border-white/10 bg-surface">
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <CardTitle className="font-heading text-lg text-white">
              Recent Expenses
            </CardTitle>
          </CardHeader>
          <CardContent>
            {summary.recentExpenses.length === 0 ? (
              <p className="py-8 text-center text-sm text-zinc-600">
                No expenses recorded yet.
              </p>
            ) : (
              <div className="space-y-2">
                {summary.recentExpenses.map((expense) => (
                  <div
                    key={expense.id}
                    className="flex items-center justify-between rounded-md px-2 py-2 hover:bg-white/4"
                  >
                    <div>
                      <p className="text-sm text-white">
                        {expense.description}
                      </p>
                      <p className="text-xs text-zinc-500">
                        {categoryLabels[expense.category]} ·{" "}
                        {formatDate(expense.date)}
                      </p>
                    </div>
                    <span className="text-sm font-medium text-red-400">
                      -{formatCurrency(expense.amount)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
