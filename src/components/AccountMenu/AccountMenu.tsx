"use client";

import { paymentProvider } from "@/config";
import { useColorModeValues } from "@/hooks/useColorModeValues";
import {
  Menu,
  MenuButton,
  Flex,
  Avatar,
  MenuList,
  MenuItem,
  Text,
} from "@chakra-ui/react";
import axios from "axios";
import { signOut } from "next-auth/react";
import toast from "react-hot-toast";
import { TbSelector, TbLogout, TbCreditCard } from "react-icons/tb";

const getLemonSqueezyCustomerPortalUrl = async () => {
  const response = await axios.get("/api/subscriptions");
  return response?.data?.customerPortalUrl;
};

const getStripeCustomerPortalUrl = async () => {
  const response = await axios.get("/api/stripe/customer-portal");
  return response?.data?.url;
};

export const onLoadCustomerPortal = async () => {
  try {
    if (paymentProvider === "lemon-squeezy") {
      const url = await getLemonSqueezyCustomerPortalUrl();
      if (url) {
        window.open(url, "_blank");
        return;
      }
    }

    if (paymentProvider === "stripe") {
      const url = await getStripeCustomerPortalUrl();
      if (url) {
        window.open(url, "_blank");
        return;
      }
    }

    toast.error("You don't have an active subscription");
  } catch (error) {
    toast.error("You don't have an active subscription");
  }
};

type AccountMenuProps = {
  userName: string;
  userEmail: string;
  userPictureUrl: string;
};

/*
  @docs
  Set the .env var LEMONSQUEEZY_API_KEY
*/
export const AccountMenu = ({
  userName,
  userEmail,
  userPictureUrl,
}: AccountMenuProps) => {
  const { primaryTextColor, secondaryTextColor } = useColorModeValues();

  return (
    <Menu colorScheme="blackAlpha">
      <MenuButton
        mb="8px"
        p="8px 0"
        display="flex"
        flexDir="row"
        alignItems="center"
        w="100%"
      >
        <Flex alignItems="center" w="100%">
          <Flex mr="8px">
            <Avatar src={userPictureUrl} size="sm" />
          </Flex>
          <Flex
            flexDir="column"
            fontSize="13px"
            alignItems="flex-start"
            w="100%"
          >
            <Text
              fontWeight="semibold"
              color={primaryTextColor}
              display="inline-block"
              textOverflow="ellipsis"
              whiteSpace="nowrap"
              overflow="hidden"
              maxW="140px"
            >
              {userName}
            </Text>
            <Text
              color={secondaryTextColor}
              fontSize="12px"
              textOverflow="ellipsis"
              display="inline-block"
              whiteSpace="nowrap"
              overflow="hidden"
              maxW="140px"
            >
              {userEmail}
            </Text>
          </Flex>
          <Flex ml="8px" color={secondaryTextColor}>
            <TbSelector size="24px" />
          </Flex>
        </Flex>
      </MenuButton>
      <MenuList fontSize="13px" color={primaryTextColor}>
        <MenuItem onClick={() => onLoadCustomerPortal()}>
          <Flex mr="8px">
            <TbCreditCard size="16px" />
          </Flex>
          Billing
        </MenuItem>

        <MenuItem
          onClick={() => {
            signOut({
              callbackUrl: "/",
            });
          }}
        >
          <Flex mr="8px">
            <TbLogout size="16px" />
          </Flex>
          Log out
        </MenuItem>
      </MenuList>
    </Menu>
  );
};
