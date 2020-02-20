const config = {
  gatsby: {
    pathPrefix: "/",
    siteUrl: "https://sql-cubed.com",
    gaTrackingId: null
  },
  header: {
    logo: "",
    logoLink: "https://sql-cubed.com",
    title: "SQL³",
    githubUrl: "https://github.com/davidtstafford",
    helpUrl: "",
    tweetText: "",
    links: [{ text: "", link: "" }],
    search: {
      enabled: false,
      indexName: "",
      algoliaAppId: process.env.GATSBY_ALGOLIA_APP_ID,
      algoliaSearchKey: process.env.GATSBY_ALGOLIA_SEARCH_KEY,
      algoliaAdminKey: process.env.ALGOLIA_ADMIN_KEY
    }
  },
  sidebar: {
    forcedNavOrder: [], //["/SqlServer", "/Coding", "/Graph"], // eg ["/introduction", "/codeblock"]
    collapsedNav: ["/SqlServer/Sql", "/Coding", "/Graph"], // eg ["/codeblock"],
    links: [
      {
        text: "LinkedIn",
        link: "https://www.linkedin.com/in/davidterencestafford/"
      },
      {
        text: "Twitter",
        link: "https://www.linkedin.com/in/davidterencestafford/"
      }
    ],
    frontline: false,
    ignoreIndex: true
  },
  siteMetadata: {
    title: "SQL³",
    description: "The ramblings of a SQL geek",
    ogImage: null,
    docsLocation:
      "https://github.com/hasura/gatsby-gitbook-boilerplate/tree/master/content",
    favicon: "https://graphql-engine-cdn.hasura.io/img/hasura_icon_black.svg"
  },
  pwa: {
    enabled: false, // disabling this will also remove the existing service worker.
    manifest: {
      name: "SQL Cubed",
      short_name: "SQL³",
      start_url: "/",
      background_color: "#6b37bf",
      theme_color: "#6b37bf",
      display: "standalone",
      crossOrigin: "use-credentials",
      icons: [
        {
          src: "src/sql-cubed-logo.png",
          sizes: `512x512`,
          type: `image/png`
        }
      ]
    }
  }
};

module.exports = config;
