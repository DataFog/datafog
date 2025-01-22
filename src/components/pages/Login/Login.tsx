"use client";

import {
  Button,
  Flex,
  Input,
  Link,
  Stack,
  Text,
  useColorModeValue,
} from "@chakra-ui/react";
import { useState } from "react";
import { FcGoogle } from "react-icons/fc";
import { signIn } from "next-auth/react";
import * as isEmail from "isemail";
import { brandName, signInCallbackUrl } from "@/config";
import Image from "next/image";
import { useColorModeValues } from "@/hooks/useColorModeValues";
import { TbArrowNarrowLeft } from "react-icons/tb";
import { useRouter } from "next/navigation";
import { Logo } from "@/components/atoms/Logo/Logo";

const Login = () => {
  const router = useRouter();
  const { primaryTextColor, borderColor, baseTextColor } = useColorModeValues();
  const boxBgColor = useColorModeValue("white", "transparent");

  const [isSigningInWithGoogle, setSigningInWithGoogle] = useState(false);
  const onGoogleSignIn = () => {
    setSigningInWithGoogle(true);
    signIn("google", {
      callbackUrl: signInCallbackUrl,
    });
  };

  const [isSigningInWithEmail, setSigningInWithEmail] = useState(false);
  const [email, setEmail] = useState("");

  const onEmailSignIn = async () => {
    setSigningInWithEmail(true);
    await signIn("email", {
      email,
      callbackUrl: signInCallbackUrl,
    });
    setSigningInWithEmail(false);
  };

  return (
    <Flex
      w="100vw"
      minH="100vh"
      alignItems="center"
      justifyContent="flex-start"
      flexDir="column"
    >
      <Button
        position="absolute"
        top="8px"
        left="8px"
        variant="ghost"
        leftIcon={<TbArrowNarrowLeft />}
        onClick={() => router.push("/")}
        _hover={{
          bgColor: "transparent",
        }}
      >
        Back
      </Button>
      <Flex
        w="100vw"
        h="100vh"
        alignItems="center"
        justifyContent="center"
        flexDir="column"
      >
        <Flex
          flexDir="column"
          p="0 60px 40px"
          borderRadius="24px"
          boxShadow={["none", "lg"]}
          border={["0", "1px solid"]}
          borderColor={[borderColor, borderColor]}
          alignItems="flex-start"
          position="relative"
          bgColor={boxBgColor}
          w="400px"
        >
          <Flex
            w={["360px", "480px", "560px", "640px", "780px"]}
            minW={["360px", "480px", "560px", "640px", "780px"]}
            h={["100px", "150px", "200px", "300px"]}
            minH={["100px", "150px", "200px", "300px"]}
            bgGradient="linear-gradient(267.2deg,brand.100,brand.300)"
            position="absolute"
            top="200px"
            right={["-20px", "-40px", "-80px", "-120px", "-190px"]}
            filter="blur(200px)"
            opacity="0.2"
            zIndex="-1"
          />
          <Flex
            alignItems="center"
            justifyContent="center"
            alignSelf="center"
            color="white"
            fontSize="18px"
            mb="64px"
            mt="-60px"
            ml="0px"
          >
            <Image src="/apple-touch-icon.png" alt="Datafog Logo" width={50} height={50} />
            <Text color={primaryTextColor} fontWeight="extrabold" ml="8px">
              {brandName}
            </Text>
          </Flex>
          <Text textAlign="left" fontSize="18px" fontWeight="semibold" as="h1">
            Sign in to your account
          </Text>

          <Button
            my="24px"
            h="36px"
            variant="solid"
            size="sm"
            w="100%"
            leftIcon={<FcGoogle />}
            bgColor="transparent"
            border="1px solid"
            borderColor="brand.400"
            _hover={{
              bgColor: "transparent",
              borderColor: "brand.300",
            }}
            onClick={onGoogleSignIn}
            isLoading={isSigningInWithGoogle}
            color={primaryTextColor}
          >
            Continue with Google
          </Button>

          

          
        </Flex>
      </Flex>
    </Flex>
  );
};

export default Login;
