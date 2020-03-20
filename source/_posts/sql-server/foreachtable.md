---
title: sp_MSforeachtable
date: 2020-03-20 21:13:42
tags: [SQL]
categories:
  - [SQL Server]
  - [SQL Server -> Quick Reads]
---

Sometimes you may want to run a piece of code for every table. This can be accomplished using the function sp_MSforeachtable. For example

```sql
EXEC sp_MSforeachtable 'SELECT ''?'' [Table], Count(*) [Count] FROM ?';
```

Will count the number of records in each table

```sql
EXEC sp_MSforeachtable 'TRUNCATE TABLE ?';
```

Will purge each table

```sql
EXEC sp_MSforeachtable 'ALTER TABLE ? REBUILD';
```

Will rebuild the indexes

And so on..
