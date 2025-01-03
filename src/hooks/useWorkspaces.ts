import { Workspace } from "@prisma/client";
import { useQuery } from "@tanstack/react-query";
import axios from "axios";

export const useWorkspaces = () => {
  const { data, isLoading, error } = useQuery({
    queryKey: ["workspaces"],
    queryFn: async () => {
      const response = await axios.get<{ workspaces: Workspace[] }>(
        "/api/workspaces"
      );
      return response.data.workspaces;
    },
  });

  return { data, isLoading, error };
};
