---
title: "Copy a table but without the data"
date: "2020-03-14"
tags: [SQL]
categories:
  - [SQL Server]
  - [SQL Server -> Quick Reads]
---

If you ever have the need to create an empty replica of a table. The following logic will do it:

```sql
SELECT *
INTO dbo.my_new_table
FROM dbo.my_current_table
WHERE 1=2 -- This will ignore all rows
;
GO
```
