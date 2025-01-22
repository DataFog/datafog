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
import * as isEmail from "isemail";
import { Testimonial } from "@/components/Testimonials/Testimonial";
import { testimonials } from "@/components/Testimonials/Testimonials";
import { signIn } from "next-auth/react";
import { brandName } from "@/config";
import Image from "next/image";
import { useColorModeValues } from "@/hooks/useColorModeValues";
import { TbArrowNarrowLeft } from "react-icons/tb";
import { useRouter } from "next/navigation";
import { Logo } from "@/components/atoms/Logo/Logo";

const SignUp = () => {
  const router = useRouter();
  const { primaryTextColor, secondaryTextColor, borderColor, baseTextColor } =
    useColorModeValues();

  const rightBoxColor = useColorModeValue("brand.300", "brand.700");

  const [isSigningUpWithGoogle, setSigningUpWithGoogle] = useState(false);
  const onGoogleSignUp = () => {
    setSigningUpWithGoogle(true);
    signIn("google", {
      callbackUrl: window?.location
        ? `${window.location.origin}/dashboard`
        : "",
    });
  };

  const [isSigningUpWithEmail, setSigningUpWithEmail] = useState(false);
  const [email, setEmail] = useState("");
  const onEmailSignUp = async () => {
    setSigningUpWithEmail(true);
    await signIn("email", {
      email,
      callbackUrl: window?.location
        ? `${window.location.origin}/dashboard`
        : "",
    });
    setSigningUpWithEmail(false);
  };

  return (
    <Flex
      w="100vw"
      minH="100vh"
      alignItems="center"
      justifyContent="flex-start"
      flexDir="row"
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
        w={["100vw", "100vw", "100vw", "50vw"]}
        h="100vh"
        alignItems="center"
        justifyContent="center"
        flexDir="column"
      >
        <Flex
          flexDir="column"
          p="0 60px 40px"
          boxShadow={["none", "lg", "lg", "none"]}
          borderColor={[borderColor, borderColor]}
          alignItems="flex-start"
          position="relative"
          w={["100%", "400px", "400px", "496px"]}
          borderRadius="24px"
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
            display={["block", null, null, "none"]}
          />
          <Flex
            alignItems="center"
            justifyContent="center"
            alignSelf="center"
            color="white"
            fontSize="18px"
            mb={["64px", null, null, "32px"]}
            mt="-60px"
          >
            <Image src="/apple-touch-icon.png" alt="Datafog Logo" width={50} height={50} />

          </Flex>
          <Text
            color={primaryTextColor}
            textAlign={["left", "left", "left", "center"]}
            fontSize="18px"
            fontWeight="semibold"
            as="h1"
            w="100%"
            mb={[0, null, null, "16px"]}
          >
            Create Your {brandName} Account
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
            color={primaryTextColor}
            _hover={{
              bgColor: "transparent",
              borderColor: "brand.300",
            }}
            onClick={onGoogleSignUp}
            isLoading={isSigningUpWithGoogle}
          >
            Continue with Google
          </Button>

          

          <Text
            mt="16px"
            fontSize="14px"
            color={secondaryTextColor}
            alignSelf="center"
          >
            Have an account?
            <Link href="/login" ml="4px" color="brand.500">
              Sign in
            </Link>
          </Text>
        </Flex>
      </Flex>
      <Flex
        w="50vw"
        h="100vh"
        display={["none", "none", "none", "flex"]}
        bgColor={rightBoxColor}
        alignItems="center"
        justifyContent="center"
      >
        <Image 
          src="/signup-1.png" 
          alt="Signup 1" 
          width={1000}
          height={1000}
          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
        />
      </Flex>
    </Flex>
  );
};

export default SignUp;
