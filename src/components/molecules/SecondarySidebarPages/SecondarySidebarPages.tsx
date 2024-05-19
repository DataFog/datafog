import React, { ReactElement, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Flex, FlexProps, Heading, Text } from "@chakra-ui/react";
import { TbBoxPadding, TbLayersIntersect, TbSection } from "react-icons/tb";
import { useColorModeValues } from "@/hooks/useColorModeValues";

const getMenuItemStyleProps = (isActive: boolean) => {
  return {
    w: "100%",
    _hover: {
      bgColor: "blackAlpha.100",
    },
    color: isActive ? "brand.500" : "blackAlpha.700",
    bgColor: "transparent",
    cursor: "pointer",
    borderTopWidth: "0",
    borderRadius: "8px",
    mb: ["0", "0", "0", "4px"],
    ml: "8px",
    display: "flex",
    flexDir: "row",
    alignItems: "center",
    justifyContent: "left",
    pr: "8px",
  };
};

type SettingsItemProps = {
  isActive: boolean;
  onClick: () => void;
  children: ReactElement | string;
} & FlexProps;

export const SettingsItem = ({
  isActive,
  onClick,
  children,
  ...props
}: SettingsItemProps) => {
  return (
    <Flex
      {...(getMenuItemStyleProps(isActive) as FlexProps)}
      alignSelf="flex-start"
      ml="-8px"
      p="10px"
      fontSize="14px"
      borderRadius="8px"
      fontWeight={isActive ? 700 : 500}
      onClick={onClick}
      sx={{
        svg: {
          mr: "4px",
        },
      }}
      {...props}
    >
      {children}
    </Flex>
  );
};

type Sections = "section1" | "section2" | "section3";

export const SecondarySidebarPages = () => {
  const router = useRouter();
  const searchParams = useSearchParams();

  const pagePath = "/dashboard";

  const [currentSection, setCurrentSection] = useState<Sections>(
    (searchParams.get("section") as Sections) || "section1"
  );

  const { bgColor, borderColor, secondaryTextColor, primaryTextColor } =
    useColorModeValues();

  return (
    <Flex flexDir="row" w="100%" h="100vh">
      <Flex
        flexDir="column"
        h="100vh"
        borderRight="1px solid gray"
        borderColor={borderColor}
        p="16px"
        bgColor={bgColor}
        w="200px"
        position="fixed"
      >
        <Text
          fontSize="14px"
          fontWeight="700"
          color={primaryTextColor}
          mb="8px"
        >
          Sections
        </Text>
        <SettingsItem
          isActive={currentSection === "section1"}
          onClick={() => {
            const targetSection = "section1";
            router.push(pagePath + `?section=${targetSection}`);
            setCurrentSection(targetSection);
          }}
        >
          <>
            <TbSection size="16px" />
            Section
          </>
        </SettingsItem>
        <SettingsItem
          isActive={currentSection === "section2"}
          onClick={() => {
            const targetSection = "section2";
            router.push(pagePath + `?section=${targetSection}`);
            setCurrentSection(targetSection);
          }}
        >
          <>
            <TbLayersIntersect size="16px" />
            Layout
          </>
        </SettingsItem>
        <SettingsItem
          isActive={currentSection === "section3"}
          onClick={() => {
            const targetSection = "section3";
            router.push(pagePath + `?section=${targetSection}`);
            setCurrentSection(targetSection);
          }}
        >
          <>
            <TbBoxPadding size="16px" />
            Box model
          </>
        </SettingsItem>
      </Flex>
      <Flex
        flexDir="column"
        alignSelf="flex-start"
        w={["100vw", "100vw", "100vw", "calc(100vw - 430px)"]}
        ml="200px"
        flexGrow={1}
        p="24px"
      >
        {currentSection === "section1" && <Heading size="md">Section</Heading>}
        {currentSection === "section2" && <Heading size="md">Layout</Heading>}
        {currentSection === "section3" && (
          <Heading size="md">Box model</Heading>
        )}
        {/* add more sections here */}
      </Flex>
    </Flex>
  );
};
