"use client";

import { Routes } from "@/data/routes";
import { useIsLogged } from "./useIsLogged";
import { useRouter } from "next/navigation";
import { useState } from "react";

export const useGetStarted = () => {
  const router = useRouter();
  const { user, isLogged } = useIsLogged();
  const [isLoadingCta, setLoadingCta] = useState(false);

  const onGetStartedClick = () => {
    setLoadingCta(true);
    if (user) {
      router.push(Routes.scan);
      return;
    }
    router.push('/signup');
    setTimeout(() => setLoadingCta(false), 100);
  };

  return { isLogged, isLoadingCta, onGetStartedClick };
};
