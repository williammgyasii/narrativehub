import { PageHeader } from "@/components/page-header";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DiscoverPresets } from "./discover-presets";
import { GooglePlacesSearch } from "./google-places-search";
import { EventbriteSearch } from "./eventbrite-search";
import { WeddingPlatformsSearch } from "./wedding-platforms-search";
import { EmailEnrichment } from "./email-enrichment";
import { ManualProspecting } from "./manual-prospecting";
import { getSkippedPlaceIds } from "@/lib/actions/lead-finder";
import {
  Sparkles,
  MapPin,
  CalendarDays,
  Heart,
  Mail,
  Compass,
} from "lucide-react";

export default async function LeadFinderPage() {
  const skippedPlaceIds = await getSkippedPlaceIds();
  return (
    <div className="space-y-6">
      <PageHeader
        title="Lead Finder"
        description="Discover clients and referral partners in the DMV area."
      />

      <Tabs defaultValue="discover" className="space-y-4">
        <TabsList className="bg-surface border border-white/10 overflow-x-auto no-scrollbar w-full justify-start">
          <TabsTrigger
            value="discover"
            className="flex items-center gap-1.5 data-[state=active]:bg-gold/10 data-[state=active]:text-gold"
          >
            <Sparkles className="h-3.5 w-3.5" />
            Discover
          </TabsTrigger>
          <TabsTrigger
            value="places"
            className="flex items-center gap-1.5 data-[state=active]:bg-gold/10 data-[state=active]:text-gold"
          >
            <MapPin className="h-3.5 w-3.5" />
            Google Places
          </TabsTrigger>
          <TabsTrigger
            value="events"
            className="flex items-center gap-1.5 data-[state=active]:bg-gold/10 data-[state=active]:text-gold"
          >
            <CalendarDays className="h-3.5 w-3.5" />
            Eventbrite
          </TabsTrigger>
          <TabsTrigger
            value="wedding"
            className="flex items-center gap-1.5 data-[state=active]:bg-gold/10 data-[state=active]:text-gold"
          >
            <Heart className="h-3.5 w-3.5" />
            The Knot
          </TabsTrigger>
          <TabsTrigger
            value="emails"
            className="flex items-center gap-1.5 data-[state=active]:bg-gold/10 data-[state=active]:text-gold"
          >
            <Mail className="h-3.5 w-3.5" />
            Email Enrichment
          </TabsTrigger>
          <TabsTrigger
            value="prospecting"
            className="flex items-center gap-1.5 data-[state=active]:bg-gold/10 data-[state=active]:text-gold"
          >
            <Compass className="h-3.5 w-3.5" />
            Prospecting
          </TabsTrigger>
        </TabsList>

        <TabsContent value="discover">
          <DiscoverPresets initialSkippedIds={Array.from(skippedPlaceIds)} />
        </TabsContent>

        <TabsContent value="places">
          <GooglePlacesSearch />
        </TabsContent>

        <TabsContent value="events">
          <EventbriteSearch />
        </TabsContent>

        <TabsContent value="wedding">
          <WeddingPlatformsSearch />
        </TabsContent>

        <TabsContent value="emails">
          <EmailEnrichment />
        </TabsContent>

        <TabsContent value="prospecting">
          <ManualProspecting />
        </TabsContent>
      </Tabs>
    </div>
  );
}
