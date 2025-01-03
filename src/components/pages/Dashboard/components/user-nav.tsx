import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useSession } from "next-auth/react";
import { getNameInitials } from "../utils/getNameInitials";
import { CreateWorkspaceModal } from "@/components/organisms/CreateWorkspaceModal/CreateWorkspaceModal";
import { useState } from "react";
import { onLoadCustomerPortal } from "@/components/AccountMenu/AccountMenu";

export function UserNav() {
  const { data: session } = useSession();

  const userName = session?.user.name;
  const userEmail = session?.user.email;
  const userPictureUrl = session?.user.image;

  const [showNewWorkspaceDialog, setShowNewWorkspaceDialog] = useState(false);

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" className="relative h-8 w-8 rounded-full">
            <Avatar className="h-8 w-8">
              <AvatarImage src={userPictureUrl} alt={userName} />
              <AvatarFallback>{getNameInitials(userName)}</AvatarFallback>
            </Avatar>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="w-56" align="end" forceMount>
          <DropdownMenuLabel className="font-normal">
            <div className="flex flex-col space-y-1">
              <p className="text-sm font-medium leading-none">{userName}</p>
              <p className="text-xs leading-none text-muted-foreground">
                {userEmail}
              </p>
            </div>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuGroup>
            <DropdownMenuItem onClick={() => onLoadCustomerPortal()}>
              Billing
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setShowNewWorkspaceDialog(true)}>
              New Workspace
            </DropdownMenuItem>
          </DropdownMenuGroup>
          <DropdownMenuSeparator />
          <DropdownMenuItem>Log out</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <CreateWorkspaceModal
        isOpen={showNewWorkspaceDialog}
        onClose={() => setShowNewWorkspaceDialog(false)}
      />
    </>
  );
}
