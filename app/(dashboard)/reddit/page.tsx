import { PageHeader } from "@/components/page-header";
import { RedditOpportunities } from "@/components/reddit-opportunities";
import { getRedditLeads, getNewRedditLeadsCount } from "@/lib/queries/reddit";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default async function RedditPage() {
  const [newLeads, savedLeads, dismissedLeads, newCount] = await Promise.all([
    getRedditLeads("new"),
    getRedditLeads("saved"),
    getRedditLeads("dismissed"),
    getNewRedditLeadsCount(),
  ]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Reddit Opportunities"
        description="Monitor DMV subreddits for people looking for photographers."
      />

      <Tabs defaultValue="new" className="space-y-4">
        <TabsList className="bg-surface border border-white/10">
          <TabsTrigger
            value="new"
            className="data-[state=active]:bg-gold/10 data-[state=active]:text-gold"
          >
            New ({newLeads.length})
          </TabsTrigger>
          <TabsTrigger
            value="saved"
            className="data-[state=active]:bg-gold/10 data-[state=active]:text-gold"
          >
            Saved ({savedLeads.length})
          </TabsTrigger>
          <TabsTrigger
            value="dismissed"
            className="data-[state=active]:bg-gold/10 data-[state=active]:text-gold"
          >
            Dismissed ({dismissedLeads.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="new">
          <RedditOpportunities leads={newLeads} newCount={newCount} />
        </TabsContent>

        <TabsContent value="saved">
          <RedditOpportunities leads={savedLeads} newCount={0} />
        </TabsContent>

        <TabsContent value="dismissed">
          <RedditOpportunities leads={dismissedLeads} newCount={0} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
