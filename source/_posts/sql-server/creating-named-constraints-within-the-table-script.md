---
title: "Creating named constraints within the table creation script"
date: "2020-03-14"
tags: [SQL]
categories:
  - [SQL Server]
  - [SQL Server -> Quick Reads]
---

If you are ever as OCD as me and like naming all of your constraints to avoid SQL auto generating them, then here are a few examples within this create script:

```sql
CREATE TABLE dbo.Person
(
      ID INT IDENTITY(1,1) CONSTRAINT pk_Person PRIMARY KEY -- Creates PK Called 'pk_Person'
    , FirstName VARCHAR(100) NOT NULL
    , Surname VARCHAR(100) NOT NULL
    , GenderID INT CONSTRAINT fk_Person_Gender FOREIGN KEY REFERENCES dbo.Gender(ID) -- Creates an FK called 'fk_Person_Gender'
    , DOB DATE CONSTRAINT chk_Valid_DBO CHECK (DOB <=GETDATE() ) -- Creates a check constraint called 'chk_Valid_DBO'
);
```
