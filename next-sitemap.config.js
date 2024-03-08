const glob = require("glob");

const siteUrl = "http://example.com";

/** @type {import('next-sitemap').IConfig} */
module.exports = {
  additionalPaths: async () => {
    try {
      const routes = await glob.sync("src/app/**/page.{md,mdx,js,jsx,ts,tsx}", {
        cwd: __dirname,
      });

      const blogRoutes = await glob.sync("blogposts/*.mdx", {
        cwd: __dirname,
      });

      console.log("Routes:", routes); // Log the routes array for debugging
      console.log("Routes type:", typeof routes); // Log the type of routes variable
      console.log("Blog Routes:", blogRoutes); // Log the routes array for debugging
      console.log("Blog Routes type:", typeof blogRoutes); // Log the type of routes variable

      const allRoutes = [...routes, ...blogRoutes];

      if (!Array.isArray(allRoutes)) {
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

      const locs = publicRoutesWithoutRouteGroups
        .filter((route) => {
          return !route.includes("/blog/[slug]");
        })
        .map((route) => {
          const path = route.replace(/^src\/app/, "").replace(/\/[^/]+$/, "");
          const loc = path === "" ? siteUrl : `${siteUrl}/${path}`;

          return loc;
        });

      const blogLocs = blogRoutes.map((route) => {
        const path = route.replace(/^blogposts/, "").replace(/\.mdx$/, "");
        const loc = `${siteUrl}/blog/${path}`;

        return loc;
      });

      const paths = [...locs, ...blogLocs].map((loc) => ({
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
  // exclude: ["/page-*"], // example usage to skip any page that starts with "page-"
};
