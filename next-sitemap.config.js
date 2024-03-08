const glob = require("glob");

const siteUrl = process.env.NEXT_PUBLIC_PROD_URL
  ? process.env.NEXT_PUBLIC_PROD_URL
  : `http://localhost:${process.env.PORT ?? 3000}`;

/** @type {import('next-sitemap').IConfig} */
module.exports = {
  additionalPaths: async () => {
    try {
      const routes = await glob.sync("src/app/**/page.{md,mdx,js,jsx,ts,tsx}", {
        cwd: __dirname,
      });

      console.log("Routes:", routes); // Log the routes array for debugging
      console.log("Routes type:", typeof routes); // Log the type of routes variable

      if (!Array.isArray(routes)) {
        throw new Error("Routes is not an array");
      }

      const publicRoutes = routes.filter(
        (page) => !page.split("/").some((folder) => folder.startsWith("_"))
      );

      const publicRoutesWithoutRouteGroups = publicRoutes.map((page) =>
        page
          .split("/")
          .filter((folder) => !folder.startsWith("(") && !folder.endsWith(")"))
          .join("/")
      );

      const locs = publicRoutesWithoutRouteGroups.map((route) => {
        const path = route.replace(/^src\/app/, "").replace(/\/[^/]+$/, "");
        const loc = path === "" ? siteUrl : `${siteUrl}/${path}`;
        return loc;
      });

      const paths = locs.map((loc) => ({
        changefreq: "daily",
        lastmod: new Date().toISOString(),
        loc,
        priority: 0.7,
      }));

      return paths;
    } catch (error) {
      console.error("Error fetching routes:", error);
      return []; // Return an empty array or handle the error as needed
    }
  },
  generateRobotsTxt: true,
  siteUrl,
};
