"use client";

import React, { useEffect, useState } from "react";

import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import { Dialog, DialogTrigger } from "@/components/ui/dialog";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { TbCheck, TbCirclePlus, TbSelector } from "react-icons/tb";
import { useSession } from "next-auth/react";
import { useWorkspaces } from "@/hooks/useWorkspaces";
import { CreateWorkspaceModal } from "@/components/organisms/CreateWorkspaceModal/CreateWorkspaceModal";

type PopoverTriggerProps = React.ComponentPropsWithoutRef<
  typeof PopoverTrigger
>;

interface TeamSwitcherProps extends PopoverTriggerProps {}

type Team = {
  label: string;
  value: string;
};

type Group = {
  label: string;
  teams: Team[];
};

export default function TeamSwitcher({ className }: TeamSwitcherProps) {
  const { data: session, status } = useSession();
  const { data: workspaces, isLoading: isLoadingWorkspaces } = useWorkspaces();

  const [open, setOpen] = useState(false);
  const [showNewTeamDialog, setShowNewTeamDialog] = useState(false);
  const [selectedTeam, setSelectedTeam] = useState<Team | null>(null);
  const [groups, setGroups] = useState<Group[]>([]);
  useEffect(() => {
    if (!isLoadingWorkspaces && status === "authenticated") {
      const user = session?.user;
      if (user) {
        const groups = [
          {
            label: "Personal Account",
            teams: [
              {
                label: user.name,
                value: "personal",
              },
            ],
          },
          {
            label: "Workspaces",
            teams: workspaces?.map((workspace) => ({
              label: workspace.name,
              value: workspace.id,
            })),
          },
        ];

        setGroups(groups as Group[]);
        if (groups[0]?.teams?.[0]) {
          setSelectedTeam(groups[0].teams[0]);
        }
      }
    }
  }, [status, isLoadingWorkspaces, workspaces?.length]);

  if (status === "loading") return null;

  return (
    <Dialog open={showNewTeamDialog} onOpenChange={setShowNewTeamDialog}>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            aria-label="Select a team"
            className={cn("w-[200px] justify-between", className)}
          >
            <Avatar className="mr-2 h-5 w-5">
              <AvatarImage
                src={`https://avatar.vercel.sh/${selectedTeam?.value}.png`}
                alt={selectedTeam?.label}
                className="grayscale"
              />
              <AvatarFallback>SC</AvatarFallback>
            </Avatar>
            {selectedTeam?.label}
            <TbSelector className="ml-auto h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[200px] p-0">
          <Command>
            <CommandInput placeholder="Search workspace..." />
            <CommandList>
              <CommandEmpty>No workspace found.</CommandEmpty>
              {groups.map((group) => (
                <CommandGroup key={group.label} heading={group.label}>
                  {group.teams.map((team) => (
                    <CommandItem
                      key={team.value}
                      onSelect={() => {
                        setSelectedTeam(team);
                        setOpen(false);
                      }}
                      className="text-sm"
                    >
                      <Avatar className="mr-2 h-5 w-5">
                        <AvatarImage
                          src={`https://avatar.vercel.sh/${team.value}.png`}
                          alt={team.label}
                          className="grayscale"
                        />
                        <AvatarFallback>SC</AvatarFallback>
                      </Avatar>
                      {team.label}
                      <TbCheck
                        className={cn(
                          "ml-auto h-4 w-4",
                          selectedTeam?.value === team.value
                            ? "opacity-100"
                            : "opacity-0"
                        )}
                      />
                    </CommandItem>
                  ))}
                </CommandGroup>
              ))}
            </CommandList>
            <CommandSeparator />
            <CommandList>
              <CommandGroup>
                <DialogTrigger asChild>
                  <CommandItem
                    onSelect={() => {
                      setOpen(false);
                      setShowNewTeamDialog(true);
                    }}
                  >
                    <TbCirclePlus className="mr-2 h-5 w-5" />
                    Create Workspace
                  </CommandItem>
                </DialogTrigger>
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
      {showNewTeamDialog && (
        <CreateWorkspaceModal
          isOpen={showNewTeamDialog}
          onClose={() => setShowNewTeamDialog(false)}
        />
      )}
    </Dialog>
  );
}
