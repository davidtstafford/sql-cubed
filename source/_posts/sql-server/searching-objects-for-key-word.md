---
title: "Searching for a key word in objects"
date: "2020-03-14"
tags: [SQL]
categories:
  - [SQL Server]
  - [SQL Server -> Quick Reads]
---

Sometime you may have to need to try to track something down, whether that be a column, comment or just something within the code somewhere

For a column in an unknown table do:

```sql
SELECT OBJECT_SCHEMA_NAME(object_id), OBJECT_NAME(object_id), *
FROM sys.columns
WHERE name = '<column you are searching for>'
```

or to search for word somewhere within a view,function,proc do the following:

```sql
SELECT OBJECT_SCHEMA_NAME(id), OBJECT_NAME(id), *
FROM syscomments
WHERE text like '%<word you are searching for>%'
```
