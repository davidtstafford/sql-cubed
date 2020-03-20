---
title: "SP_HELP and SP_HELPTEXT"
date: "2020-03-20"
tags: [SQL]
categories:
  - [SQL Server]
  - [SQL Server -> Quick Reads]
---

Suppose you want to know the details of a table or the code behind a view/proc/function. In steps SP_HELP and SP_HELPTEXT.

SQL to create an example:

```sql
CREATE TABLE dbo.myTable
(
    ID INT IDENTITY(1,1) CONSTRAINT pk_myTable PRIMARY KEY CLUSTERED
  , COL1 VARCHAR(4000)
  , COL2 INT NOT NULL
  , COL3 DATETIME
);
GO

CREATE VIEW dbo.vw_myTable
AS
SELECT * FROM dbo.myTable
;
GO

EXEC sp_help 'dbo.myTable';
GO
EXEC sp_helptext 'dbo.vw_myTable';
GO
```

Screenshot / Output:
![Output1](sp_help.png)

![Output2](sp_helptext.png)
