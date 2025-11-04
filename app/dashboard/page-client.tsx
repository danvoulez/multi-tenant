"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@radix-ui/react-label";
import { useAuth } from "@/components/auth-provider";
import { useRouter } from "next/navigation";
import { getUserTeams } from "@/lib/auth";

export function PageClient() {
  const router = useRouter();
  const { wallet, apiKey } = useAuth();
  const [teams, setTeams] = React.useState<any[]>([]);
  const [teamName, setTeamName] = React.useState("");
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    async function loadTeams() {
      if (!apiKey) return;
      const fetchedTeams = await getUserTeams(apiKey);
      setTeams(fetchedTeams);
      setLoading(false);
      
      // Redirect to first team if available
      if (fetchedTeams.length > 0) {
        router.push(`/dashboard/${fetchedTeams[0].tenant_id}`);
      }
    }
    loadTeams();
  }, [apiKey, router]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen w-screen">
        <p>Loading...</p>
      </div>
    );
  }

  if (teams.length === 0) {
    return (
      <div className="flex items-center justify-center h-screen w-screen">
        <div className="max-w-xs w-full">
          <h1 className="text-center text-2xl font-semibold">Welcome!</h1>
          <p className="text-center text-gray-500">
            Create a team to get started
          </p>
          <form
            className="mt-4"
            onSubmit={async (e) => {
              e.preventDefault();
              // TODO: Implement team creation via LogLineOS API
              console.log("Creating team:", teamName);
            }}
          >
            <div>
              <Label className="text-sm">Team name</Label>
              <Input
                placeholder="Team name"
                value={teamName}
                onChange={(e) => setTeamName(e.target.value)}
              />
            </div>
            <Button className="mt-4 w-full">Create team</Button>
          </form>
        </div>
      </div>
    );
  }

  return null;
}
