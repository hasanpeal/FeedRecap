import { IConfig } from "next-sitemap";

const config: IConfig = {
  siteUrl: "https://www.feedrecap.com", // Your domain
  generateRobotsTxt: true, // Automatically generate robots.txt
  exclude: ["/signin", "/signup"], // Exclude routes that shouldn't be indexed
  changefreq: "daily", // Default change frequency
  priority: 0.7, // Default priority
  sitemapSize: 5000, // Maximum entries per sitemap file
};

export default config;
