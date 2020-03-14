---
title: "Strip time element from a datetime"
date: "2020-03-14"
tags: [SQL]
categories:
  - [SQL Server]
  - [SQL Server -> Quick Reads]
---

Suppose you have a date time '2010-01-01 10:00:30' or you even just use GETDATE() and you are only interested in the data element. In oracle you would use TRUNC. In MS SQL you can just CAST it as a DATE as below:

```sql
SELECT CAST(GETDATE() AS DATE)
;
GO
```
