"use client";
import { useColorModeValues } from "@/hooks/useColorModeValues";
import { useMobile } from "@/hooks/useMobile";
import { Flex, HStack, Text, VStack } from "@chakra-ui/react";
import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useState } from "react";
import { IoShieldCheckmarkSharp } from "react-icons/io5";

const countries = [
  "United States",
  "Malaysia",
  "United Kingdom",
  "India",
  "Australia",
  "Chile",
  "South Korea",
  "Italy",
  "France",
  "Germany",
  "Canada",
  "Netherlands",
  "Japan",
  "Singapore",
  "Philippines",
  "Brazil",
  "Mexico",
  "Argentina",
  "New Zealand",
  "Indonesia",
  "Thailand",
  "Vietnam",
  "Hong Kong",
  "Taiwan",
  "South Africa",
  "Qatar",
  "Slovakia",
  "Macedonia",
  "Romania",
  "Estonia",
];

const getRandomCountry = () => {
  const index = Math.floor(Math.random() * countries.length);
  return countries[index];
};

const getRandomHoursAgo = () => {
  return Math.floor(Math.random() * 22) + 3;
};

export const SalesNotifications = () => {
  const isMobile = useMobile();
  const [country, setCountry] = useState(getRandomCountry());
  const [_hoursAgo, setHoursAgo] = useState(getRandomHoursAgo());
  const [isVisible, setVisible] = useState(false);

  const { bgColor, secondaryTextColor, borderColor } = useColorModeValues();

  useEffect(() => {
    if (!isMobile) {
      setInterval(() => {
        setCountry(getRandomCountry());
        setHoursAgo(getRandomHoursAgo());
      }, 10000);

      setInterval(() => {
        setVisible((prev) => !prev);
      }, 5000);
    }
  }, [isMobile]);

  if (isMobile) {
    return null;
  }

  return (
    <Flex position="fixed" left="16px" bottom="16px" zIndex={100}>
      <AnimatePresence>
        {isVisible && (
          <motion.div
            initial={{ opacity: 0, x: -200 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -200 }}
          >
            <VStack
              alignItems="flex-start"
              p="16px"
              boxShadow="md"
              borderRadius="8px"
              spacing="2px"
              border="1px solid"
              borderColor={borderColor}
              bgColor={bgColor}
            >
              <Text color="brand.600" fontSize="14px">
                Someone in <b>{country}</b> purchased
              </Text>
              <HStack fontSize="13px" color={secondaryTextColor}>
                <Text>{_hoursAgo} hours ago</Text>
                <Text>•</Text>
                <Text>
                  <HStack spacing="4px">
                    <Flex color="brand.600">
                      <IoShieldCheckmarkSharp />
                    </Flex>
                    <Text>Verified</Text>
                  </HStack>
                </Text>
              </HStack>
            </VStack>
          </motion.div>
        )}
      </AnimatePresence>
    </Flex>
  );
};
