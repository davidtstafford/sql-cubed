### Adding new features/plugins

You can add other features by having a look at the official [plugins page](https://www.gatsbyjs.org/docs/plugins/)

### Changing the date format

This starter uses Gatsby's built-in date formatter in the GraphQL queries. If you want to change the date format you see on the index page or other overviews have a look at the GraphQL query. It contains the line:

```graphql
date(formatString: "DD.MM.YYYY")
```

### Building your site

```
npm run build
```

Copy the content of the `public` folder to your webhost or use a website like Netlify which automates that for you.

**Attention:** You also need to edit `static/robots.txt` to include your domain!
