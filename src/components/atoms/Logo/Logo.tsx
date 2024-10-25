import { Flex } from "@chakra-ui/react";
import { TbRocket } from "react-icons/tb";

export const Logo = () => {
  return (
    <Flex
      w="32px"
      h="32px"
      bgColor="brand.500"
      borderRadius="8px"
      alignItems="center"
      justifyContent="center"
      color="white"
    >
      <TbRocket size="24px" />
    </Flex>
  );
};

export const LogoSmall = () => {
  return (
    <Flex
      w="18px"
      h="18px"
      bgColor="brand.500"
      borderRadius="4px"
      alignItems="center"
      justifyContent="center"
      color="white"
    >
      <TbRocket size="14px" />
    </Flex>
  );
};
