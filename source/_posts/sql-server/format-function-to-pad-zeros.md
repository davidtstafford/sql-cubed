---
title: "Padding Zeros using FORMAT"
date: "2020-03-14"
tags: [SQL]
categories:
  - [SQL Server]
  - [SQL Server -> Quick Reads]
---

Lets say you have a period value representing a month 1 - 12, but the business require the string to be padded with a zero. e.g. 01,02 ... 10,11,12

This can be accomplished using the FORMAT function

```sql
DECLARE @period INT = 1;
SELECT FORMAT(@period, 00);  --Returns 01
GO
DECLARE @period INT = 10;
SELECT FORMAT(@period, 00);  --Returns 10
GO
```
