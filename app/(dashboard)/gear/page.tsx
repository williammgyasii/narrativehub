import Link from "next/link";
import { Camera, Trash2, CalendarDays } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PageHeader } from "@/components/page-header";
import { EmptyState } from "@/components/empty-state";
import { getGearItems, getGearAllocations } from "@/lib/queries/gear";
import { deleteGearItem } from "@/lib/actions/gear";
import { formatCurrency } from "@/lib/format";
import { AddGearDialog } from "./add-gear-dialog";

const ownershipBadge = {
  owned: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
  rented: "bg-blue-500/10 text-blue-400 border-blue-500/20",
  wishlist: "bg-amber-500/10 text-amber-400 border-amber-500/20",
} as const;

function formatShortDate(date: Date): string {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
  }).format(new Date(date));
}

export default async function GearPage() {
  const [items, allocations] = await Promise.all([
    getGearItems(),
    getGearAllocations(),
  ]);

  const owned = items.filter((i) => i.ownership === "owned");
  const wishlist = items.filter((i) => i.ownership === "wishlist");

  return (
    <div className="space-y-6">
      <PageHeader
        title="Gear"
        description="Track your equipment, rentals, and see what's allocated to upcoming events."
      >
        <AddGearDialog />
      </PageHeader>

      <Tabs defaultValue="all" className="space-y-4">
        <TabsList className="bg-surface border border-white/10">
          <TabsTrigger
            value="all"
            className="data-[state=active]:bg-gold/10 data-[state=active]:text-gold"
          >
            All ({items.length})
          </TabsTrigger>
          <TabsTrigger
            value="owned"
            className="data-[state=active]:bg-gold/10 data-[state=active]:text-gold"
          >
            Owned ({owned.length})
          </TabsTrigger>
          <TabsTrigger
            value="wishlist"
            className="data-[state=active]:bg-gold/10 data-[state=active]:text-gold"
          >
            Wishlist ({wishlist.length})
          </TabsTrigger>
        </TabsList>

        {(["all", "owned", "wishlist"] as const).map((tab) => {
          const filtered =
            tab === "all"
              ? items
              : items.filter((i) => i.ownership === tab);

          return (
            <TabsContent key={tab} value={tab}>
              {filtered.length === 0 ? (
                <EmptyState
                  icon={Camera}
                  title={`No ${tab === "all" ? "" : tab + " "}gear items`}
                  description="Add your equipment to track what you have and plan purchases."
                >
                  <AddGearDialog />
                </EmptyState>
              ) : (
                <div className="space-y-2">
                  {filtered.map((item) => {
                    const itemAllocations = allocations[item.id] || [];
                    const deleteAction = async () => {
                      "use server";
                      await deleteGearItem(item.id);
                    };

                    return (
                      <Card
                        key={item.id}
                        className="border-white/10 bg-surface"
                      >
                        <CardContent className="flex items-center gap-4 p-4">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <p className="font-medium text-white">
                                {item.name}
                              </p>
                              <Badge
                                variant="outline"
                                className={ownershipBadge[item.ownership]}
                              >
                                {item.ownership}
                              </Badge>
                            </div>
                            <div className="mt-1 flex items-center gap-3 text-xs text-zinc-500">
                              <span className="capitalize">
                                {item.category}
                              </span>
                              {item.purchasePrice && (
                                <span>
                                  Value:{" "}
                                  {formatCurrency(item.purchasePrice)}
                                </span>
                              )}
                              {item.rentalPricePerDay && (
                                <span>
                                  Rental:{" "}
                                  {formatCurrency(item.rentalPricePerDay)}
                                  /day
                                </span>
                              )}
                            </div>

                            {itemAllocations.length > 0 && (
                              <div className="mt-2 flex flex-wrap gap-1.5">
                                {itemAllocations.map((alloc) => (
                                  <Link
                                    key={alloc.eventId}
                                    href={`/events/${alloc.eventId}`}
                                  >
                                    <Badge
                                      variant="outline"
                                      className="border-gold/20 bg-gold/5 text-gold text-[10px] px-1.5 py-0 h-5 hover:bg-gold/10 transition-colors cursor-pointer"
                                    >
                                      <CalendarDays className="mr-1 h-2.5 w-2.5" />
                                      {alloc.eventTitle} &middot;{" "}
                                      {formatShortDate(alloc.eventDate)}
                                    </Badge>
                                  </Link>
                                ))}
                              </div>
                            )}
                          </div>
                          <form action={deleteAction}>
                            <Button
                              type="submit"
                              variant="ghost"
                              size="sm"
                              className="h-8 w-8 p-0 text-zinc-600 hover:text-red-400"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </form>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              )}
            </TabsContent>
          );
        })}
      </Tabs>
    </div>
  );
}
