import { Flex, Image } from "@chakra-ui/react";

export const Logo = () => {
  return (
    <Flex
      w="32px"
      h="32px"
      alignItems="center"
      justifyContent="center"
    >
      <Image src="/favicon-32x32.png" alt="Logo" width={32} height={32} />
    </Flex>
  );
};

export const LogoSmall = () => {
  return (
    <Flex
      w="18px" 
      h="18px"
      alignItems="center"
      justifyContent="center"
    >
      <Image src="/favicon-16x16.png" alt="Logo" width={16} height={16} />
    </Flex>
  );
};
