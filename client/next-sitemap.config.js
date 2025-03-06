/** @type {import('next-sitemap').IConfig} */
const config = {
  siteUrl: "https://www.feedrecap.com",
  generateRobotsTxt: true,
  exclude: ["/signin", "/signup", "/dashboard"],
  changefreq: "daily",
  priority: 0.7,
  sitemapSize: 5000,
};

module.exports = config;
