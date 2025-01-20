import { extendTheme, theme } from "@chakra-ui/react";

export const colors = {
  brand: {
    "50": "#E9F0FC",
    "100": "#C1D4F6",
    "200": "#99B8F0",
    "300": "#719DEA",
    "400": "#4981E4",
    "500": "#2166DE",
    "600": "#1B51B1",
    "700": "#143D85",
    "800": "#0D2959",
    "900": "#07142C",
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
