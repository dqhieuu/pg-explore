<div align="center">
    <img width="64" alt="pg-explore logo" src="./public/pwa-64x64.png">
    <h1>pgExplore</h1>
</div>

<h3 align="center">PostgreSQL data explorer that lives in your browser.</h3>

![Demo screenshot](./public/demo1.png)

- Ever wanted to test out a SQL query without having to set up a database?  
- Have a colossal database schema, and feel like AI (maybe your locally hosted one) can help you to write SQL queries? 
- Or just want to utilize the versatility of PostgreSQL to analyze your sensitive JSON/CSV files, but importing files is a big hassle? 

pgExplore is here to help you with that! pgExplore is a Progressive Web App (PWA) Postgres explorer and server that runs offline in your browser (works without Internet connection). Completely free and open-source. Powered by [PGlite](https://github.com/electric-sql/pglite) and my desire to build a capable and user-friendly SQL toolbox 😃

Try it out at [pg-explore.vercel.app](https://pg-explore.vercel.app).

## Features

- [x] Create and manage Postgres databases that persist in your browser
- [x] Add table schema & data files (SQL, DBML, JSON,...) to build your query workflow
- [x] Configurable AI assistant fed with your database schema to help you write SQL queries
- [x] SQL query editor with error highlighting and autocompletion
- [x] Table & chart visualization for query results
- [ ] Table relationship visualization
- [ ] Embeddable SQL query widgets for interactive SQL sharing
- [ ] Export & import database schema and data

And of course, feel free to open an issue or PR if you have any suggestions or feature requests. I will be happy to consider them.

## Getting Started

### Local Development

```bash
git clone https://github.com/dqhieuu/pg-explore.git
cd pg-explore
pnpm i
pnpm dev
```

### Build

```bash
git clone https://github.com/dqhieuu/pg-explore.git
cd pg-explore
pnpm i
pnpm build
```
