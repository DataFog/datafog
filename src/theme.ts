import { extendTheme, theme } from "@chakra-ui/react";

export const colors = {
  brand: {
    50: theme.colors.gray["900"],
    100: theme.colors.gray["900"],
    200: theme.colors.gray["900"],
    300: theme.colors.gray["300"],
    400: theme.colors.gray["900"],
    500: theme.colors.gray["900"],
    600: theme.colors.gray["900"],
    700: theme.colors.gray["900"],
    800: theme.colors.gray["900"],
    900: theme.colors.gray["900"],
  },
};

const components = {
  Input: {
    baseStyle: {
      field: {
        _focusVisible: {
          boxShadow: `none !important`,
          borderColor: `brand.100`,
        },
        _hover: {
          boxShadow: `none`,
        },
        _focus: {
          boxShadow: `none`,
        },
      },
    },
  },
  Tooltip: {
    baseStyle: {
      p: "8px 16px",
      borderRadius: "6px",
      boxShadow: "sm",
      bgColor: "white",
      color: "blackAlpha.700",
      border: "1px solid",
      borderColor: "blackAlpha.50",
      fontWeight: 500,
      fontSize: "12px",
    },
  },
};

export const customTheme = extendTheme({
  styles: {
    global: {
      ".js-focus-visible :focus:not([data-focus-visible])": {
        outline: "none",
        boxShadow: "none",
      },
      "*:focus-visible": {
        outline: "none",
        boxShadow: "none",
      },
    },
  },
  colors,
  components,
  shadows: { outline: `0 0 0 3px ${colors.brand["100"]}` },
  config: {
    initialColorMode: "system",
    useSystemColorMode: false,
  },
});
