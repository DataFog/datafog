import { Flex, Stack, Text } from "@chakra-ui/react";
import { TbRocket } from "react-icons/tb";

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
      href="https://shipped.club"
      target="_blank"
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
        <Text fontWeight="bold" color="brand.500">
          Shipped.club
        </Text>
      </Stack>
    </Stack>
  );
};
