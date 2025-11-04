"use client";

import { useAuth } from "@/components/auth-provider";
import { getUserTeams } from "@/lib/auth";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Check, ChevronsUpDown, PlusCircle } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

interface Team {
  tenant_id: string;
  name: string;
  role: string;
}

interface TeamSwitcherProps {
  selectedTeamId?: string;
  urlMap?: (teamId: string) => string;
}

export function TeamSwitcher({ selectedTeamId, urlMap }: TeamSwitcherProps) {
  const { apiKey, wallet } = useAuth();
  const router = useRouter();
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadTeams() {
      if (!apiKey) return;
      const fetchedTeams = await getUserTeams(apiKey);
      setTeams(fetchedTeams);
      setLoading(false);
    }
    loadTeams();
  }, [apiKey]);

  const currentTeam = teams.find((t) => t.tenant_id === (selectedTeamId || wallet?.tenant_id));

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          className="w-full justify-between"
        >
          <span className="truncate">
            {loading ? "Loading..." : currentTeam?.name || "Select team"}
          </span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-56">
        <DropdownMenuLabel>Teams</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {teams.map((team) => (
          <DropdownMenuItem
            key={team.tenant_id}
            onSelect={() => {
              const url = urlMap ? urlMap(team.tenant_id) : `/dashboard/${team.tenant_id}`;
              router.push(url);
            }}
          >
            <Check
              className={`mr-2 h-4 w-4 ${
                team.tenant_id === (selectedTeamId || wallet?.tenant_id)
                  ? "opacity-100"
                  : "opacity-0"
              }`}
            />
            <div className="flex flex-col">
              <span>{team.name}</span>
              <span className="text-xs text-muted-foreground">{team.role}</span>
            </div>
          </DropdownMenuItem>
        ))}
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={() => router.push("/teams/create")}>
          <PlusCircle className="mr-2 h-4 w-4" />
          Create team
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
