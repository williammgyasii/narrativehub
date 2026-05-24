import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getProfile } from "@/lib/queries/profile";
import { ProfileForm } from "./profile-form";

export default async function SettingsPage() {
  const profile = await getProfile();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-2xl font-bold tracking-tight text-white">
          Settings
        </h1>
        <p className="mt-1 text-sm text-zinc-400">
          Your profile info is used in AI-generated emails and outreach
        </p>
      </div>

      <Card className="border-white/10 bg-surface">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium text-zinc-400">
            Photographer Profile
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ProfileForm profile={profile} />
        </CardContent>
      </Card>
    </div>
  );
}
