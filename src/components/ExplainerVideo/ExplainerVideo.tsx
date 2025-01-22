"use client";

import { Flex, Text } from "@chakra-ui/react";
import { TbPlayerPlayFilled } from "react-icons/tb";
import { Section } from "../atoms/Section/Section";

export const ExplainerVideo = () => {
  return (
    <Section mt="200px">
      <Flex flexDir="column" alignItems="center">
        <Text
          textAlign="center"
          mb="24px"
          color="brand.400"
          fontWeight={600}
          px="48px"
        >
          See how DataFog works in 20 seconds
        </Text>

        <Flex
          sx={{
            img: {
              maxW: "calc(70vw - 48px)",
              opacity: 0.9,
            },
          }}
          position="relative"
          borderRadius={["8px", "8px", "16px", "16px"]}
          bgColor="black"
          overflow="hidden"
        >
          <Flex
            position="absolute"
            top="calc(50% - 32px)"
            left="calc(50% - 32px)"
            color="white"
            bgColor="brand.400"
            alignItems="center"
            justifyContent="center"
            borderRadius="100px"
            p="12px"
            cursor="pointer"
            zIndex={2}
            transition="all .15s linear"
            _hover={{
              transform: "scale(1.1)",
            }}
            onClick={() => {
              const video = document.getElementById('explainer-video') as HTMLVideoElement;
              if (video) {
                video.play();
              }
            }}
          >
            <TbPlayerPlayFilled size="40px" />
          </Flex>
          <video 
            id="explainer-video"
            src="/datafog-demo.mp4"
            poster={`/explainer-thumbnail.png`}
            style={{ maxWidth: 'calc(70vw - 48px)' }}
            controls={false}
          />
        </Flex>
      </Flex>
    </Section>
  );
};
