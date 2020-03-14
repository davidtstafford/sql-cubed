---
title: "Slowly Changing Dimension Type 4"
date: "2020-02-29"
tags: [SQL]
categories: [SQL Server]
---

# Understanding

For this type of dimension the version history is tracked in a separate table. e.g.

Main Table:

| ID  | Version | Name        | Salary | H / W / A | Valid From |
| --- | ------- | ----------- | ------ | --------- | ---------- |
| 1   | 1       | Joe Bloggs  | 11,500 | A         | 2018-10-30 |
| 2   | 4       | Jane Bloggs | 15,000 | A         | 2018-07-12 |

History Table:

| ID  | Version | Name        | Salary | H / W / A | Valid From | Valid To   |
| --- | ------- | ----------- | ------ | --------- | ---------- | ---------- |
| 2   | 1       | Jane Bloggs | 6.50   | H         | 2012-03-27 | 2013-05-22 |
| 2   | 2       | Jane Bloggs | 12,000 | A         | 2013-05-22 | 2017-07-12 |
| 2   | 3       | Jane Bloggs | 13,500 | A         | 2017-07-12 | 2018-07-12 |

You can see that Joe Bloggs' salary has remained unchanged and has no records in the history table. However, Jane's salary has changed three times and the three old records are in the history table.

This can allow for minimal logging or even "as at" reporting. For example, if the fact table holds the "ID" and "Version". The ID can be used as a foreign key to the main to give an "as is" result, or the "ID" and "Version" can be used as a foreign key to changed history table to give the "as at" result. **Note** that when a fact is first inserted it will acquire the current version of the dim.

# Working Example

With this understanding, here is how I go about populating and maintaining the two tables associated. For the example this following will happen

1. Stage records that contain Marvel Super Heros (Name, Real First Name, Real Surname)
2. Record Hero's Name, First Name and Surname into a warehouse table
3. Maintain history of changes that could be referenced

**Create all of the tables and schemaa**

```sql
CREATE Schema Staging;
GO

CREATE Schema Warehouse;
GO

CREATE TABLE Staging.MarvelHero
(
      Name           VARCHAR(200) -- Considered Unique
    , RealFirstName  VARCHAR(100)
    , RealSurname    VARCHAR(100)
);

CREATE TABLE Warehouse.dim_MarvelHero
(
      ID         INT IDENTITY(1,1)
    , [Version]  INT
    , HeroName   VARCHAR(200)
    , FirstName  VARCHAR(100)
    , Surname    VARCHAR(100)
    , ValidFrom  DATE
    , ValidTo    DATE
    , isDeleted  BIT DEFAULT(0)
)
;

CREATE TABLE Warehouse.dim_MarvelHero__history
(
      ID         INT
    , [Version]  INT
    , HeroName   VARCHAR(200)
    , FirstName  VARCHAR(100)
    , Surname    VARCHAR(100)
    , ValidFrom  DATE
    , ValidTo    DATE
    , isDeleted  BIT
)
;
```

- Staging.MarvelHero : Holds that entire dataset of the external dimension coming in
- Warehouse.dim_MarvelHero : Main dimension table with the warehouse. Additional Columns:
  - ID : Primary Key;
  - Version : Each time there is a change this will be incremented by one;
  - ValidFrom : A date to represent when this version became valid
  - ValidTo : If the record is soft deleted this will record the deleted date
  - isDeleted : Records if the record is soft deleted
- Warehouse.dim_MarvelHero\_\_history : As above but storing all version and not just the current one

Load up the staging table:

```sql
INSERT INTO Staging.MarvelHero
VALUES
      ('Iron Man', 'Tony', 'Stark')
    , ('Spider Man', 'Petr', 'Parker') -- Typo
    , ('Hulk', 'Bruce', 'Banner')
    , ('Black Widow', 'Natasha', 'Romanova')
;
```

I've created a typo as an example of a correction that will result in two versions by the end.

Now for the stored procedure that will handle populating the dimensional tables for staging whilst obeying the conditions of a type 4 dimension mentioned at the start.

```sql
CREATE PROCEDURE Warehouse.usp_Populate_dim_MarvelHero
AS
BEGIN

    -- Drop Temp table if it exists
    IF OBJECT_ID('tempdb..#heros') IS NOT NULL
        DROP TABLE #heros
    ;

    -- Table to store Source and target where applicable and matched
    CREATE TABLE #heros
    (
          TargetID    INT -- ID that is in the warehouse
        , SoftDelete  BIT DEFAULT(0)

        -- Columns to match source
        , source_Name           VARCHAR(200)
        , source_RealFirstName  VARCHAR(100)
        , source_RealSurname    VARCHAR(100)

        -- Columns to match target
        , currentTarget_Version    INT
        , currentTarget_HeroName   VARCHAR(200)
        , currentTarget_FirstName  VARCHAR(100)
        , currentTarget_Surname    VARCHAR(100)
        , currentTarget_ValidFrom  DATE
        , currentTarget_ValidTo    DATE
        , currentTarget_isDeleted  BIT
    );

    --INSERT MATCHES THAT DIFFER INTO TEMP TABLE
    INSERT INTO #heros
    (
          TargetID

        , source_Name
        , source_RealFirstName
        , source_RealSurname

        -- Columns to match target
        , currentTarget_Version
        , currentTarget_HeroName
        , currentTarget_FirstName
        , currentTarget_Surname
        , currentTarget_ValidFrom
        , currentTarget_ValidTo
        , currentTarget_isDeleted
    )
    SELECT
          t.ID
        , s.Name
        , s.RealFirstName
        , s.RealSurname
        , t.Version
        , t.HeroName
        , t.FirstName
        , t.Surname
        , t.ValidFrom
        , t.ValidTo
        , t.isDeleted
    FROM Staging.MarvelHero                 s
        INNER JOIN Warehouse.dim_MarvelHero t   ON  t.HeroName = s.Name
    WHERE
    (
           ISNULL(s.RealFirstName, '###')  !=  ISNULL(t.FirstName, '###')
        OR ISNULL(s.RealSurname  , '###')  !=  ISNULL(t.Surname  , '###')
        OR t.IsDeleted = 1 -- If this matches then the entry has been reinstated
    );


    --INSERT NEW ROWS INTO THE TEMP TABLE
    INSERT INTO #heros
    (
          source_Name
        , source_RealFirstName
        , source_RealSurname
    )
    SELECT
          s.Name
        , s.RealFirstName
        , s.RealSurname
    FROM Staging.MarvelHero                s
        LEFT JOIN Warehouse.dim_MarvelHero t   ON  t.HeroName = s.Name
    WHERE t.ID IS NULL -- Not Matched in Target
    ;


    --INSERT SOFT DELETED ROWS INTO THE TEMP TABLE .. i.e. rows that are no longer present in source
    INSERT INTO #heros
    (
          TargetID
        , SoftDelete
        , currentTarget_HeroName
        , currentTarget_FirstName
        , currentTarget_Surname
    )
    SELECT
          t.ID
        , 1 -- Mark to soft delete
        , t.HeroName
        , t.FirstName
        , t.Surname
    FROM Staging.MarvelHero                 s
        RIGHT JOIN Warehouse.dim_MarvelHero t   ON  t.HeroName = s.Name
    WHERE s.[Name] IS NULL -- Not Matched in Source
    ;

    /* At this stage of the code we now know the state of all rows

       Unchanged
       Changed
       New
       Deleted (Soft Deleted)

       Now we can merge into the main table
       and version control into the history table
    */

    MERGE Warehouse.dim_MarvelHero   t
        USING #heros                 s   ON (s.TargetID = t.ID)
    WHEN MATCHED THEN
    UPDATE SET
          t.Version    = CASE WHEN SoftDelete = 0 THEN currentTarget_Version + 1 ELSE t.Version END -- Increment Version
        , t.ValidFrom  = CASE WHEN SoftDelete = 0 THEN CAST(GETDATE() AS DATE) ELSE t.ValidFrom END-- Set Todays date for new version
        , t.FirstName  = CASE WHEN SoftDelete = 0 THEN s.source_RealFirstName ELSE t.FirstName END
        , t.Surname    = CASE WHEN SoftDelete = 0 THEN s.source_RealSurname ELSE t.Surname END

        , t.ValidTo    = CASE WHEN SoftDelete = 1 THEN CAST(GETDATE() AS DATE) ELSE NULL END
        , t.isDeleted  = s.SoftDelete

    WHEN NOT MATCHED BY TARGET THEN -- T.ID IS NULL, THEREFORE IT IS NEW
    INSERT
    (
          HeroName
        , FirstName
        , Surname
        , [Version]
        , ValidFrom
    )
    VALUES
    (
          s.source_Name
        , s.source_RealFirstName
        , s.source_RealSurname
        , 1 -- New row, so 1st version
        , CAST(GETDATE() AS DATE) -- Valid from today
    )
    ;


    --Merge done, now to handle history

    INSERT INTO Warehouse.dim_MarvelHero__history
    (
          ID
        , [Version]
        , HeroName
        , FirstName
        , Surname
        , ValidFrom
        , ValidTo
        , isDeleted
    )
    SELECT
          TargetID
        , currentTarget_Version
        , currentTarget_HeroName
        , currentTarget_FirstName
        , currentTarget_Surname
        , currentTarget_ValidFrom
        , CAST(GETDATE() AS DATE)
        , currentTarget_isDeleted
    FROM #heros
    WHERE TargetID IS NOT NULL -- Insert changes only (not soft deletes or new entries)
    AND SoftDelete = 0
    ;

END;

GO
```

I have commented the code, but will go into some detail about each block:

1. A temp table is created called #heros. It will be used to store all the relevant details of the staging records coming in and any details about the current record in the dimension, should it match.
2. The first insert into the #hero table will be for records that match but that have changed. The unique column in staging and the dim is "Name"/"HeroName". Therefore staging is joined to the dim based on this column and if either of the columns: FirstName or Surname have changed then a change must have occurred. Also note that if a match occurs to the dim, but the dim had previously been marked as deleted then a change is also written as it will need to be reinstated.
3. The second insert, inserts rows that are only in staging. These are new rows that have never been seen before
4. The final insert, inserts rows that no longer exist in the staging table. These are rows that will need to be soft deleted.
5. The temp table is then used to merge into the dim. The ID of the dim is used to determine the type of match. If the ID matches then we know that this dim exists in "some" state. Therefore if it matches that values will be updated accordingly or it will be soft deleted. If it doesn't match, then it's consider new and inserted
6. Finally any updates (other than soft deletes) are inserted into the history table. Note that if a soft delete is reinstated, then the record of the soft delete will be stored into the history table

Some testing:

```sql
EXEC Warehouse.usp_Populate_dim_MarvelHero;

UPDATE Staging.MarvelHero
SET RealFirstName = 'Peter'
WHERE RealFirstName = 'Petr';

EXEC Warehouse.usp_Populate_dim_MarvelHero;

delete top(1) from Staging.MarvelHero;

EXEC Warehouse.usp_Populate_dim_MarvelHero;
```

1. Correct the typo and then run the proc
2. Delete the first row and run the proc again

Results:

```sql
SELECT * FROM Warehouse.dim_MarvelHero
SELECT * FROM Warehouse.dim_MarvelHero__history
```

Output:

![Output](output.png)

We can now see that the old value for the typo is in the history table and that the first row in the main table is now marked has soft deleted.
