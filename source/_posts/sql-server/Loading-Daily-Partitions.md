---
title: "Loading auto generated daily partition"
date: "2018-12-30"
tags: [SQL]
categories: [SQL Server]
---

> NOTE: This topic was was based on logic prior to the ability to truncate a partition directly.

[![GitHub](GitHub.png)](https://github.com/davidtstafford/DailyAutoPartitioning)

I have worked on the number of batch systems that have required partitioning for various reasons. I won't go into all of the reasons of why and when you should chose partitioning, as that would lead into its own blog post, but there are occasions when it is nice to be able to isolate batch pieces of work and just slot the data in when it is ready (or quickly remove it).

So, in the following walkthrough, I will go through:

- Creating a simple partitioned table
- Creating an area to stage the data
- Creating a fast method to purge the data
- Creating a set of procedures to support this
  - Include a procedure that will create/prepare the partition for the requested date.

#### Step 1 .. Clean my environment

Just a few scripts that will remove any objects hanging around for any previous runs of the tutorial.

```sql
BEGIN TRY DROP TABLE Staging.MainTable__SwitchIN END TRY BEGIN CATCH END CATCH
GO
BEGIN TRY DROP TABLE Staging.MainTable__SwitchOUT END TRY BEGIN CATCH END CATCH
GO
BEGIN TRY DROP TABLE dbo.MainTable END TRY BEGIN CATCH END CATCH
GO
BEGIN TRY DROP VIEW MetaData.vw_PartitionDetails END TRY BEGIN CATCH END CATCH
GO
BEGIN TRY DROP PROC dbo.sp_PrepareMainTablePartitions END TRY BEGIN CATCH END CATCH
GO
BEGIN TRY DROP PROC dbo.sp_LoadMainTable END TRY BEGIN CATCH END CATCH
GO
BEGIN TRY DROP PARTITION SCHEME psRunDates END TRY BEGIN CATCH END CATCH
GO
BEGIN TRY DROP PARTITION FUNCTION pfRunDates END TRY BEGIN CATCH END CATCH
GO
BEGIN TRY DROP SCHEMA [Staging] END TRY BEGIN CATCH END CATCH
GO
BEGIN TRY DROP SCHEMA [MetaData] END TRY BEGIN CATCH END CATCH
GO
```

I know it's lazy wrapping it all up with Begin Trys :).

#### Step 2 .. Creating some additional schemas for my objects to live in

I'll be creating

- Staging - For landing the data
- MetaData - To house useful Tables / Views

```sql
CREATE SCHEMA [Staging]
GO

CREATE SCHEMA [MetaData]
GO
```

> Not really essential, I'm just a bit OCD.

#### Step 3 .. Creating the Partitions

I'll create the partition function and scheme and setup them up with one date.

```sql
CREATE PARTITION FUNCTION pfRunDates (DATE)
AS RANGE RIGHT FOR VALUES ('2019-01-01')
GO

CREATE PARTITION SCHEME psRunDates
AS PARTITION pfRunDates
TO ([Primary],[Primary],[Primary])
GO
```

> Note: I have defined 3 filegroups even though there is only 1 date. This has been done to allow for the "Next Used" partition. i.e. 1 filegroup is for the data. 1 filegroup is beyond the range. The final filegroup is in place as a placeholder for a new partition to be created.

#### Step 4 .. Creating the tables

Creating 3 tables:

- Main table (dbo.MainTable)
  - Clustered index for the ID Column
  - Non Clustered index for the RunDate Column
  - And importantly, uses the partition schema "psRunDates". Based on the RunDate column
- Landing Table (Staging.MainTable\_\_SwitchIN)
  - Identical setup to the Main Table other than living in the Staging schema
- Purge Table (Staging.MainTable\_\_SwitchOUT)
  - Not indexed
  - Clustered index also contains the RunDate column as this will make the table appear identical to the partitioned table

```sql
CREATE TABLE dbo.MainTable
(
      ID            INT
    , UserName      VARCHAR(100)
    , RunDate       DATE
) ON psRunDates(RunDate)
GO
CREATE CLUSTERED INDEX CIX__MainTable_ID ON dbo.MainTable(ID)
GO
CREATE NONCLUSTERED INDEX NCIX__MainTable_RunDate ON dbo.MainTable(RunDate)
GO

CREATE TABLE Staging.MainTable__SwitchIN
(
      ID            INT
    , UserName      VARCHAR(100)
    , RunDate       DATE
) ON psRunDates(RunDate)
GO
CREATE CLUSTERED INDEX CIX__MainTable__SwitchIN_ID ON Staging.MainTable__SwitchIN(ID)
GO
CREATE NONCLUSTERED INDEX NCIX__MainTable__SwitchIN_RunDate ON Staging.MainTable__SwitchIN(RunDate)
GO

CREATE TABLE Staging.MainTable__SwitchOUT
(
      ID            INT
    , UserName      VARCHAR(100)
    , RunDate       DATE
) ON [Primary]
GO
-- Note this index does not look identical, but RunDate is part of the index
-- to equal RunDate being the partition key in the partitioned table
CREATE CLUSTERED INDEX CIX__MainTable__SwitchOUT_ID
    ON Staging.MainTable__SwitchOUT(ID,RunDate)
GO
CREATE NONCLUSTERED INDEX NCIX__MainTable__SwitchOUT_RunDate
    ON Staging.MainTable__SwitchOUT(RunDate)
GO
```

> Note - The loading table is partitioned as well. Technically it doesn't have to be. If not though, you would need to do some check constaints magic to makes the tables appear identical for partition switching.

#### Step 5 .. Creating a view to display partition information

The script below will create the view within the MetaData schema.

```sql
CREATE VIEW MetaData.vw_PartitionDetails
AS
    SELECT
          FunctionName      =   pf.name
        , SchemeName        =   ps.name
        , TableName         =   o.name
        , PartitionNumber   =   stat.partition_number
        , [RowCount]        =   stat.row_count
        , RangeValue        =   prv.value
    FROM            sys.partition_functions     pf

        INNER JOIN  sys.partition_schemes       ps  ON  ps.function_id  =   pf.function_id

        INNER JOIN  sys.indexes                 i   ON  i.data_space_id =   ps.data_space_id
                                                    AND i.[type]        =   1 -- Limit to clustered index

        INNER JOIN  sys.partitions              p   ON  i.object_id     =   p.object_id
                                                    AND p.index_id      =   1 -- Limit to first index

        INNER JOIN  sys.objects                 o   ON  o.object_id     =   i.object_id
                                                    AND o.[type]        =   'U'

        LEFT  JOIN sys.partition_range_values   prv ON prv.function_id      =   pf.function_id
                                                    AND p.partition_number  =   CASE pf.boundary_value_on_right
                                                                                    WHEN 1 THEN prv.boundary_id + 1
                                                                                    ELSE prv.boundary_id
                                                                                END

        INNER JOIN sys.dm_db_partition_stats    stat    ON  stat.object_id          =   p.object_id
                                                        AND stat.index_id           =   p.index_id
                                                        AND stat.partition_id       =   p.partition_id
                                                        AND stat.partition_number   =   p.partition_number
GO
```

> There are a number of ways to produce the same output in a view, and maybe there is a more refined way to it. One day I may try to refine this script ;).

#### Step 6 .. Creating the all important procedures

The scripts below will create 2 stored procedures. One to prepare new partitions and purge data if that partition already exists. The other to migrate the data from the landing area into the main table.

```sql
CREATE PROCEDURE dbo.sp_PrepareMainTablePartitions
(
      @PartitionDate DATE
    , @OverwriteData BIT = 1 -- 1 = Get rid of previous data.. 0 = Thrown error if previous data found
)
AS
BEGIN

    DECLARE
          @PartitionNumber INT
        , @ErrorMessage NVARCHAR(4000)
    ;

    SELECT @PartitionNumber = PartitionNumber
    FROM MetaData.vw_PartitionDetails
    WHERE TableName = 'MainTable'
    AND RangeValue = @PartitionDate;

    IF @OverwriteData = 0 AND @PartitionNumber IS NOT NULL
    BEGIN
        SET @ErrorMessage = 'Partition for this date already exists.  Please purge any data and remove the partition, or recall the proc with OverwriteData = 1';
        RAISERROR(@ErrorMessage,16,1);
        RETURN;
    END

    IF @PartitionNumber IS NULL
    BEGIN
        ALTER PARTITION FUNCTION pfRunDates()
            SPLIT RANGE (@PartitionDate);

        ALTER PARTITION SCHEME psRunDates
            NEXT USED [PRIMARY];

        SELECT @PartitionNumber = PartitionNumber
        FROM MetaData.vw_PartitionDetails
        WHERE TableName = 'MainTable'
        AND RangeValue = @PartitionDate;


    END

    TRUNCATE TABLE Staging.MainTable__SwitchOUT;

    TRUNCATE TABLE Staging.MainTable__SwitchIN;

    ALTER TABLE dbo.MainTable SWITCH PARTITION @PartitionNumber TO Staging.MainTable__SwitchOUT;

END
GO

CREATE PROCEDURE dbo.sp_LoadMainTable
(
      @PartitionDate DATE
)
AS
BEGIN

    DECLARE
          @PartitionNumber INT
        , @ErrorMessage NVARCHAR(4000)
    ;

    IF EXISTS ( SELECT 1 FROM dbo.MainTable WHERE RunDate = @PartitionDate)
    BEGIN
        SET @ErrorMessage = 'Data has already been loaded for the date.  Please purge it first';
        RAISERROR(@ErrorMessage,16,1);
        RETURN;
    END

    SELECT @PartitionNumber = PartitionNumber
    FROM MetaData.vw_PartitionDetails
    WHERE TableName = 'MainTable'
    AND RangeValue = @PartitionDate;

    IF @PartitionNumber IS NULL
    BEGIN
        SET @ErrorMessage = 'Partition has not been created.  Run the proc "dbo.sp_PrepareMainTablePartitions" first';
        RAISERROR(@ErrorMessage,16,1);
        RETURN;
    END

    ALTER TABLE Staging.MainTable__SwitchIn SWITCH PARTITION @PartitionNumber
        TO dbo.MainTable PARTITION @PartitionNumber;

END
GO
```

> By default **dbo.sp_PrepareMainTablePartitions** will purge data is the partition already exists. But, setting **@OverwriteData=0** will stop this. It will throw an error if it discovers an existing partition.

#### Step 7 .. Testing it all out

##### 7.1

Firstly, lets fire some data into the main table for '2019-01-01'

```sql
INSERT INTO dbo.MainTable
(ID, UserName, RunDate)
VALUES
      (1,'Bob','2019-01-01')
    , (2, 'Jane','2019-01-01')
```

We can now see how this affects the partitions by selecting from the view **MetaData.vw_PartitionDetails**.
![2 Rows](2Rows.png)

So we are now in a place were we can do a mock batch load.

##### 7.2

> all the the scripts below would normally be run via an etl process, but we are just mocking it through direct sql calls.

The first step is to prepare for the load by calling the procedure **dbo.sp_PrepareMainTablePartitions**.

> We will be running for 2019-01-02 and purging any data if it exists before.

```sql
EXEC dbo.sp_PrepareMainTablePartitions '2019-01-02',1
```

Once this is completed. If you select from the **MetaData.vw_PartitionDetails** view again, you can see the new partition.
![New Partition](NewPartition.png)

##### 7.3

Now we can stage the data by inserting into the **Staging.MainTable\_\_SwitchIn** table.

```sql
INSERT INTO Staging.MainTable__SwitchIN
( ID, UserName, RunDate)
VALUES
      (3,'Vicky','2019-01-02')
    , (4, 'Eric','2019-01-02')
    , (5, 'Scott', '2019-01-02')
```

We can now see how this affects the partitions by selecting from the view **MetaData.vw_PartitionDetails**.
![3 New Rows](3NewRows.png)

##### 7.4

The data is now in the staging area. If this was an actual batch run within an ETL process this would be an ideal time to implement some validation before we move the data in the primary table.

To move to data in the main table we now call the procedure

```sql
EXEC dbo.sp_LoadMainTable '2019-01-02'
```

We can now see how this affects the partitions by selecting from the view **MetaData.vw_PartitionDetails**.
![3 Moved Rows](3MovedRows.png)

**Done**

#### Step 8 - Removing data

The stored procedure **dbo.sp_PrepareMainTablePartitions** will perpare a new partition for data to be inserted, but it will also nuke data if it already existed. Therefore this can be used to blast away a previous load.

Let's see

```sql
EXEC dbo.sp_PrepareMainTablePartitions '2019-01-02',1
```

![Rows Gone](RowsGone.png)
The data is gone again. This was an immediate delete, similar to a truncate but only over the one partition. The stored procedure has actually moved this table into the **Staging.MainTable\_\_SwitchOUT** table. Therefore the data can still be queried until the next run, or in theory it could be used before the next run.
![SwitchOut Output](SwitchOutOutput.png)

#### Thanks

> Here's all the code should you wish to copy it down, and thanks for taking the time to read this topic.

```sql

BEGIN TRY DROP TABLE Staging.MainTable__SwitchIN END TRY BEGIN CATCH END CATCH
GO
BEGIN TRY DROP TABLE Staging.MainTable__SwitchOUT END TRY BEGIN CATCH END CATCH
GO
BEGIN TRY DROP TABLE dbo.MainTable END TRY BEGIN CATCH END CATCH
GO
BEGIN TRY DROP VIEW MetaData.vw_PartitionDetails END TRY BEGIN CATCH END CATCH
GO
BEGIN TRY DROP PROC dbo.sp_PrepareMainTablePartitions END TRY BEGIN CATCH END CATCH
GO
BEGIN TRY DROP PROC dbo.sp_LoadMainTable END TRY BEGIN CATCH END CATCH
GO
BEGIN TRY DROP PARTITION SCHEME psRunDates END TRY BEGIN CATCH END CATCH
GO
BEGIN TRY DROP PARTITION FUNCTION pfRunDates END TRY BEGIN CATCH END CATCH
GO
BEGIN TRY DROP SCHEMA [Staging] END TRY BEGIN CATCH END CATCH
GO
BEGIN TRY DROP SCHEMA [MetaData] END TRY BEGIN CATCH END CATCH
GO




CREATE SCHEMA [Staging]
GO

CREATE SCHEMA [MetaData]
GO


CREATE PARTITION FUNCTION pfRunDates (DATE)
AS RANGE RIGHT FOR VALUES ('2019-01-01')
GO

CREATE PARTITION SCHEME psRunDates
AS PARTITION pfRunDates
TO ([Primary],[Primary],[Primary])
GO

CREATE TABLE dbo.MainTable
(
      ID            INT
    , UserName      VARCHAR(100)
    , RunDate       DATE
) ON psRunDates(RunDate)
GO
CREATE CLUSTERED INDEX CIX__MainTable_ID ON dbo.MainTable(ID)
GO
CREATE NONCLUSTERED INDEX NCIX__MainTable_RunDate ON dbo.MainTable(RunDate)
GO

CREATE TABLE Staging.MainTable__SwitchIN
(
      ID            INT
    , UserName      VARCHAR(100)
    , RunDate       DATE
) ON psRunDates(RunDate)
GO
CREATE CLUSTERED INDEX CIX__MainTable__SwitchIN_ID ON Staging.MainTable__SwitchIN(ID)
GO
CREATE NONCLUSTERED INDEX NCIX__MainTable__SwitchIN_RunDate ON Staging.MainTable__SwitchIN(RunDate)
GO

CREATE TABLE Staging.MainTable__SwitchOUT
(
      ID            INT
    , UserName      VARCHAR(100)
    , RunDate       DATE
) ON [Primary]
GO
-- Note this index does not look identical, but RunDate is part of the index
-- to equal RunDate being the partition key in the partitioned table
CREATE CLUSTERED INDEX CIX__MainTable__SwitchOUT_ID
    ON Staging.MainTable__SwitchOUT(ID,RunDate)
GO
CREATE NONCLUSTERED INDEX NCIX__MainTable__SwitchOUT_RunDate
    ON Staging.MainTable__SwitchOUT(RunDate)
GO

CREATE VIEW MetaData.vw_PartitionDetails
AS
    SELECT
          FunctionName      =   pf.name
        , SchemeName        =   ps.name
        , TableName         =   o.name
        , PartitionNumber   =   stat.partition_number
        , [RowCount]        =   stat.row_count
        , RangeValue        =   prv.value
    FROM            sys.partition_functions     pf

        INNER JOIN  sys.partition_schemes       ps  ON  ps.function_id  =   pf.function_id

        INNER JOIN  sys.indexes                 i   ON  i.data_space_id =   ps.data_space_id
                                                    AND i.[type]        =   1 -- Limit to clustered index

        INNER JOIN  sys.partitions              p   ON  i.object_id     =   p.object_id
                                                    AND p.index_id      =   1 -- Limit to first index

        INNER JOIN  sys.objects                 o   ON  o.object_id     =   i.object_id
                                                    AND o.[type]        =   'U'

        LEFT  JOIN sys.partition_range_values   prv ON prv.function_id      =   pf.function_id
                                                    AND p.partition_number  =   CASE pf.boundary_value_on_right
                                                                                    WHEN 1 THEN prv.boundary_id + 1
                                                                                    ELSE prv.boundary_id
                                                                                END

        INNER JOIN sys.dm_db_partition_stats    stat    ON  stat.object_id          =   p.object_id
                                                        AND stat.index_id           =   p.index_id
                                                        AND stat.partition_id       =   p.partition_id
                                                        AND stat.partition_number   =   p.partition_number
GO


CREATE PROCEDURE dbo.sp_PrepareMainTablePartitions
(
      @PartitionDate DATE
    , @OverwriteData BIT = 1 -- 1 = Get rid of previous data.. 0 = Thrown error if previous data found
)
AS
BEGIN

    DECLARE
          @PartitionNumber INT
        , @ErrorMessage NVARCHAR(4000)
    ;

    SELECT @PartitionNumber = PartitionNumber
    FROM MetaData.vw_PartitionDetails
    WHERE TableName = 'MainTable'
    AND RangeValue = @PartitionDate;

    IF @OverwriteData = 0 AND @PartitionNumber IS NOT NULL
    BEGIN
        SET @ErrorMessage = 'Partition for this date already exists.  Please purge any data and remove the partition, or recall the proc with OverwriteData = 1';
        RAISERROR(@ErrorMessage,16,1);
        RETURN;
    END

    IF @PartitionNumber IS NULL
    BEGIN
        ALTER PARTITION FUNCTION pfRunDates()
            SPLIT RANGE (@PartitionDate);

        ALTER PARTITION SCHEME psRunDates
            NEXT USED [PRIMARY];

        SELECT @PartitionNumber = PartitionNumber
        FROM MetaData.vw_PartitionDetails
        WHERE TableName = 'MainTable'
        AND RangeValue = @PartitionDate;


    END


    TRUNCATE TABLE Staging.MainTable__SwitchOUT;

    TRUNCATE TABLE Staging.MainTable__SwitchIN;

    ALTER TABLE dbo.MainTable SWITCH PARTITION @PartitionNumber TO Staging.MainTable__SwitchOUT;

END
GO



CREATE PROCEDURE dbo.sp_LoadMainTable
(
      @PartitionDate DATE
)
AS
BEGIN

    DECLARE
          @PartitionNumber INT
        , @ErrorMessage NVARCHAR(4000)
    ;

    IF EXISTS ( SELECT 1 FROM dbo.MainTable WHERE RunDate = @PartitionDate)
    BEGIN
        SET @ErrorMessage = 'Data has already been loaded for the date.  Pplease purge it first';
        RAISERROR(@ErrorMessage,16,1);
        RETURN;
    END

    SELECT @PartitionNumber = PartitionNumber
    FROM MetaData.vw_PartitionDetails
    WHERE TableName = 'MainTable'
    AND RangeValue = @PartitionDate;

    IF @PartitionNumber IS NULL
    BEGIN
        SET @ErrorMessage = 'Partition has not been created.  Run the proc "dbo.sp_PrepareMainTablePartitions" first';
        RAISERROR(@ErrorMessage,16,1);
        RETURN;
    END

    ALTER TABLE Staging.MainTable__SwitchIn SWITCH PARTITION @PartitionNumber
        TO dbo.MainTable PARTITION @PartitionNumber;

END
GO


EXEC dbo.sp_PrepareMainTablePartitions '2019-01-02',1 ;

INSERT INTO dbo.MainTable
(ID, UserName, RunDate)
VALUES
      (1,'Bob','2019-01-01')
    , (2, 'Jane','2019-01-01')
;


INSERT INTO Staging.MainTable__SwitchIN
( ID, UserName, RunDate)
VALUES
      (3,'Vicky','2019-01-02')
    , (4, 'Eric','2019-01-02')
    , (5, 'Scott', '2019-01-02')
;


EXEC dbo.sp_LoadMainTable '2019-01-02' ;

SELECT *
FROM MetaData.vw_PartitionDetails ;

SELECT *
FROM dbo.MainTable ;
```
