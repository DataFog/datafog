import { Stack, Text } from "@chakra-ui/react";
import { LogoSmall } from "../atoms/Logo/Logo";

export const BuiltWith = () => {
  return (
    <Stack
      direction="row"
      border="1px solid"
      borderColor="blackAlpha.200"
      p="4px 6px"
      borderRadius="8px"
      alignItems="center"
      as="a"
      href="/"
      fontSize="12px"
      transition="all .15s linear"
      _hover={{
        color: "brand.700",
        bgColor: "brand.50",
        borderColor: "brand.200",
      }}
    >
      <Text>Built with</Text>
      <Stack direction="row" spacing="4px" alignItems="center">
        <LogoSmall />
        <Text fontWeight="bold" color="brand.500">
          Shipped.club
        </Text>
      </Stack>
    </Stack>
  );
};
