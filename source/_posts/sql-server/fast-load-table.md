---
title: "Fast loading a table"
date: "2020-03-14"
tags: [SQL]
categories:
  - [SQL Server]
  - [SQL Server -> Quick Reads]
---

Sometimes I need to populate a lot of data into a table. First run of a fact maybe, and on that occasion I could be dealing with millions of rows. The trick to do the quickly is to lock the table. There are caveats that I won't discuss in the short post, but the example below shows the syntax

```sql
INSERT INTO dbo.MyTable WITH (TABLOCKX)
SELECT foo, bar
FROM dbo.foobar
;
```
