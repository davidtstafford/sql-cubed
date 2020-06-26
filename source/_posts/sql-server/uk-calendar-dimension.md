---
title: "UK Calendar Dimension"
date: "2020-03-14"
tags: [SQL]
categories:
  - [SQL Server]
  - [Azure Synapse]
---

In most warehouse projects there will be a need for a calendar. I created the script within this blog many years ago and slowly adapted it. As I deal with UK calendars a lot, I ended up adding the UK (+ St Paddy's Day) bank holidays. Recently I modified this script to work with Azure Synapse (Formerly known as Azure SQL Data Warehouse), as it had some functionality that would not have been supported.

# I have a schema in my DB called "DW".

```sql
CREATE SCHEMA DW;
```

# Early May Bank Holiday Function

```sql
CREATE FUNCTION [DW].[GetEarlyMayBankHoliday]
(
    @Y INT
)
RETURNS DATE
AS
BEGIN

	DECLARE @Date DATE
    SET @Date = CONVERT( DATE, CONVERT(VARCHAR(10), @Y ) + '-05-01' )
	DECLARE @Holiday DATE

	SET @Holiday = CASE
		WHEN DATENAME(WEEKDAY, DATEADD(DAY, 0,@Date )) = 'Monday' THEN @Date
		WHEN DATENAME(WEEKDAY, DATEADD(DAY, 1,@Date )) = 'Monday' THEN DATEADD(DAY,1,@Date )
		WHEN DATENAME(WEEKDAY, DATEADD(DAY, 2,@Date )) = 'Monday' THEN DATEADD(DAY,2,@Date )
		WHEN DATENAME(WEEKDAY, DATEADD(DAY, 3,@Date )) = 'Monday' THEN DATEADD(DAY,3,@Date )
		WHEN DATENAME(WEEKDAY, DATEADD(DAY, 4,@Date )) = 'Monday' THEN DATEADD(DAY,4,@Date )
		WHEN DATENAME(WEEKDAY, DATEADD(DAY, 5,@Date )) = 'Monday' THEN DATEADD(DAY,5,@Date )
		WHEN DATENAME(WEEKDAY, DATEADD(DAY, 6,@Date )) = 'Monday' THEN DATEADD(DAY,6,@Date )
	END

	-- SOME HACKS
	SET @Holiday =	CASE @Y
							WHEN 2020 THEN '2020-05-08' -- Moved for 75th VE day
							ELSE @Holiday
						END
	RETURN @Holiday

END
GO
```

Simply looks for the first monday in May and returns that date for the given year. **Note that VE day is different in 2020, therefore it's hard coded**

# Easter Sunday

```sql
CREATE FUNCTION [DW].[GetEasterSunday]
( @Y INT )
RETURNS DATE
AS
BEGIN
    DECLARE
	    @EpactCalc INT,
        @PaschalDaysCalc INT,
        @NumOfDaysToSunday INT,
        @EasterMonth INT,
        @EasterDay INT

    SET @EpactCalc = (24 + 19 * (@Y % 19)) % 30
    SET @PaschalDaysCalc = @EpactCalc - (@EpactCalc / 28)
    SET @NumOfDaysToSunday = @PaschalDaysCalc - (
        (@Y + @Y / 4 + @PaschalDaysCalc - 13) % 7
    )

    SET @EasterMonth = 3 + (@NumOfDaysToSunday + 40) / 44

    SET @EasterDay = @NumOfDaysToSunday + 28 - (
        31 * (@EasterMonth / 4)
    )

    RETURN
    (
        CONVERT
        (  SMALLDATETIME,
                 RTRIM(@Y)
            + RIGHT('0'+RTRIM(@EasterMonth), 2)
            + RIGHT('0'+RTRIM(@EasterDay), 2)
        )
    )

END;
GO
```

Returns easter sunday for the given year. Can't take credit for the maths in this function. I found it many many years ago somewhere deep in the interweb.

# Easter Monday

```sql
CREATE FUNCTION [DW].[GetEasterMonday]
(
    @Y INT
)
RETURNS DATE
AS
BEGIN
    RETURN ( DATEADD(DAY, 1,DW.GetEasterSunday(@Y)) )
END;
GO
```

Looks for the monday directly after Easter Sunday for the given year.

# Good Friday

```sql
CREATE FUNCTION [DW].[GetGoodFriday]
(
    @Y INT
)
RETURNS DATE
AS
BEGIN
    RETURN ( DATEADD(DAY, -2,DW.GetEasterSunday(@Y)) )
END
```

Looks for the Friday before Easter Sunday for the given year

# Spring Bank Holiday

```sql
CREATE FUNCTION [DW].[GetSpringBankHoliday]
(
    @Y INT
)
RETURNS DATE
AS
BEGIN

	DECLARE @Date DATE
    SET @Date = CONVERT( DATE, CONVERT(VARCHAR(10), @Y ) + '-05-25' )
	DECLARE @Holiday DATE

	SET @Holiday = CASE
		WHEN DATENAME(WEEKDAY, DATEADD(DAY, 0,@Date )) = 'Monday' THEN @Date
		WHEN DATENAME(WEEKDAY, DATEADD(DAY, 1,@Date )) = 'Monday' THEN DATEADD(DAY,1,@Date )
		WHEN DATENAME(WEEKDAY, DATEADD(DAY, 2,@Date )) = 'Monday' THEN DATEADD(DAY,2,@Date )
		WHEN DATENAME(WEEKDAY, DATEADD(DAY, 3,@Date )) = 'Monday' THEN DATEADD(DAY,3,@Date )
		WHEN DATENAME(WEEKDAY, DATEADD(DAY, 4,@Date )) = 'Monday' THEN DATEADD(DAY,4,@Date )
		WHEN DATENAME(WEEKDAY, DATEADD(DAY, 5,@Date )) = 'Monday' THEN DATEADD(DAY,5,@Date )
		WHEN DATENAME(WEEKDAY, DATEADD(DAY, 6,@Date )) = 'Monday' THEN DATEADD(DAY,6,@Date )
	END

	RETURN @Holiday


END;
GO
```

Simply looks for the last Monday in May and returns that date for the given year.

# SUmmer Bank Holiday

```sql


CREATE FUNCTION [DW].[GetSummerBankHoliday]
(
    @Y INT
)
RETURNS DATE
AS
BEGIN

	DECLARE @Date DATE
    SET @Date = CONVERT( DATE, CONVERT(VARCHAR(10), @Y ) + '-08-25' )
	DECLARE @Holiday DATE

	SET @Holiday = CASE
		WHEN DATENAME(WEEKDAY, DATEADD(DAY, 0,@Date )) = 'Monday' THEN @Date
		WHEN DATENAME(WEEKDAY, DATEADD(DAY, 1,@Date )) = 'Monday' THEN DATEADD(DAY,1,@Date )
		WHEN DATENAME(WEEKDAY, DATEADD(DAY, 2,@Date )) = 'Monday' THEN DATEADD(DAY,2,@Date )
		WHEN DATENAME(WEEKDAY, DATEADD(DAY, 3,@Date )) = 'Monday' THEN DATEADD(DAY,3,@Date )
		WHEN DATENAME(WEEKDAY, DATEADD(DAY, 4,@Date )) = 'Monday' THEN DATEADD(DAY,4,@Date )
		WHEN DATENAME(WEEKDAY, DATEADD(DAY, 5,@Date )) = 'Monday' THEN DATEADD(DAY,5,@Date )
		WHEN DATENAME(WEEKDAY, DATEADD(DAY, 6,@Date )) = 'Monday' THEN DATEADD(DAY,6,@Date )
	END

	RETURN @Holiday

END;
GO
```

Returns the last monday in August for the given year

# Calendar Table (Dimension)

```sql
CREATE TABLE [DW].[dim_date] (
    [DateID]      VARCHAR (8)  NOT NULL,
    [Date]        DATE         NOT NULL,
    [Day]         TINYINT      NULL,
    [DayName]     VARCHAR (10) NULL,
    [MonthOfYear] TINYINT      NULL,
    [MonthName]   VARCHAR (10) NULL,
    [DayOfWeek]   TINYINT      NULL,
    [DayOfMonth]  TINYINT      NULL,
    [DayOfYear]   SMALLINT     NULL,
    [WeekOfMonth] TINYINT      NULL,
    [WeekOfYear]  TINYINT      NULL,
    [Quarter]     TINYINT      NULL,
    [QuarterName] VARCHAR (6)  NULL,
    [Year]        SMALLINT     NULL,
    [IsWeekend]   BIT          NULL,
    [IsHoliday]   BIT          NULL,
    [HolidayText] VARCHAR (64) NULL,
    PRIMARY KEY CLUSTERED ([DateID] ASC) WITH (FILLFACTOR = 80)
);
```

# Proc to populate a given year

```sql
CREATE PROCEDURE [DW].[usp_populate_dim_date]
(
	  @year CHAR(4)
)
AS
BEGIN

	SET DATEFIRST 1;
	SET DATEFORMAT dmy;

    CREATE TABLE #dim
    (
        [Date]            DATE
      , [Day]             TINYINT
      , [DayName]         VARCHAR(10)
      , [MonthOfYear]     TINYINT
      , [MonthName]       VARCHAR(10)
      , [DayOfWeek]       TINYINT
      , [DayOfMonth]      TINYINT
      , [DayOfYear]       SMALLINT
      , [WeekOfMonth]     TINYINT
      , [WeekOfYear]      TINYINT
      , [Quarter]         TINYINT
      , [Year]            SMALLINT
      , yyyymmdd          VARCHAR(8)
    );
    DECLARE @NumberOfDays INT;
    DECLARE @LastDay DATE;
    SET @LastDay = CAST(@year + '-12-31' AS DATE);
    SET @NumberOfDays =  DATEPART(DAYOFYEAR,@LastDay);
    DECLARE @counter INT = 0;
    DECLARE @RollingDate DATE;

    SET @RollingDate = CAST(@year + '-01-01' AS DATE);

    WHILE @counter < @NumberOfDays
    BEGIN
        INSERT INTO #dim (
                              [Date]
                            , [Day]
                            , [DayName]
                            , [MonthOfYear]
                            , [MonthName]
                            , [DayOfWeek]
                            , [DayOfMonth]
                            , [DayOfYear]
                            , [WeekOfMonth]
                            , [WeekOfYear]
                            , [Quarter]
                            , [Year]
                            , yyyymmdd
                          )
            SELECT
                                @RollingDate
                              , DATEPART(DAY,      @RollingDate)
                              , DATENAME(WEEKDAY,  @RollingDate)
                              , DATEPART(MONTH,    @RollingDate)
                              , DATENAME(MONTH,    @RollingDate)
                              , DATEPART(WEEKDAY,  @RollingDate)
                              , DATEPART(DAY,      @RollingDate)
                              , DATEPART(DAYOFYEAR,@RollingDate)
                              , DATEDIFF(WEEK, DATEADD(WEEK, DATEDIFF(WEEK, 0, DATEADD(MONTH, DATEDIFF(MONTH, 0, CAST(@RollingDate AS DATETIME)), 0)), 0), CAST(@RollingDate AS DATETIME) - 1) + 1
                              , DATEPART(WEEK,     @RollingDate)
                              , DATEPART(QUARTER,  @RollingDate)
                              , DATEPART(YEAR,     @RollingDate)
                              , CONVERT(CHAR(8),   @RollingDate, 112)
        ;

		SET @RollingDate = DATEADD(DAY,1,@RollingDate);
		SET @counter += 1;
	END;


	DELETE DW.dim_date
		WHERE [Date] in ( SELECT [Date] FROM #dim)
	;

	INSERT INTO DW.dim_date
	(
		  [DateID]
		, [Date]
		, [Day]
		, [DayName]
		, [MonthOfYear]
		, [MonthName]
		, [DayOfWeek]
		, [DayOfMonth]
		, [DayOfYear]
		, [WeekOfMonth]
		, [WeekOfYear]
		, [Quarter]
		, QuarterName
		, [Year]
	)
	SELECT
		  [DateID] = yyyymmdd
		, [Date]
		, [Day]
		, [DayName]
		, [MonthOfYear] = [MonthOfYear]
		, [MonthName]
		, [DayOfWeek]
		, [DayOfMonth]
		, [DayOfYear]
		, [WeekOfMonth]
		, [WeekOfYear]
		, [Quarter]
		, QuarterName = CONVERT(VARCHAR(6), CASE [quarter] WHEN 1 THEN 'First' WHEN 2 THEN 'Second' WHEN 3 THEN 'Third' WHEN 4 THEN 'Fourth' END)
		, [Year]
	FROM #dim;

	UPDATE DW.dim_date
		SET IsWeekend = 0
	WHERE [DayOfWeek] < 6;

	UPDATE DW.dim_date
		SET IsWeekend = 1
	WHERE [DayOfWeek] >= 6;

	/* ********************* ------- HOLIDAYS -------- ********************* */

	--New Years Day
		UPDATE DW.dim_date
			SET HolidayText  = 'New Year''s Day', IsHoliday = 1
		WHERE [Date] = CAST( CONVERT(VARCHAR(10), @year + '-01-01') AS DATE );

		IF DATENAME(WEEKDAY,(CAST( CONVERT(VARCHAR(10), @year + '-01-01') AS DATE )) ) = 'Sunday'
			UPDATE DW.dim_date
				SET HolidayText = 'New Year''s Day roll forward', IsHoliday = 1
			WHERE [Date] = CAST( CONVERT(VARCHAR(10), @year + '-01-02') AS DATE );

		IF DATENAME(WEEKDAY,(CAST( CONVERT(VARCHAR(10), @year + '-01-01') AS DATE )) ) = 'Saturday'
			UPDATE DW.dim_date
				SET HolidayText = 'New Year''s Day roll forward', IsHoliday = 1
			WHERE [Date] = CAST( CONVERT(VARCHAR(10), @year + '-01-03') AS DATE );

	-- St Patricks Day
		UPDATE DW.dim_date
			SET HolidayText = 'St Patricks Day', IsHoliday = 1
		WHERE [Date] = CAST( CONVERT(VARCHAR(10), @year + '-03-17') AS DATE );

		IF DATENAME(WEEKDAY,(CAST( CONVERT(VARCHAR(10), @year + '-03-17') AS DATE )) ) = 'Sunday'
			UPDATE DW.dim_date
				SET HolidayText = 'St Patricks Day roll forward', IsHoliday = 1
			WHERE [Date] = CAST( CONVERT(VARCHAR(10), @year + '-03-18') AS DATE );

		IF DATENAME(WEEKDAY,(CAST( CONVERT(VARCHAR(10), @year + '-03-17') AS DATE )) ) = 'Saturday'
			UPDATE DW.dim_date
				SET HolidayText = 'St Patricks Day roll forward', IsHoliday = 1
			WHERE [Date] = CAST( CONVERT(VARCHAR(10), @year + '-03-19') AS DATE );

	-- 12 July
		UPDATE DW.dim_date
			SET HolidayText = '12th July', IsHoliday = 1
		WHERE [Date] = CAST( CONVERT(VARCHAR(10), @year + '-07-12') AS DATE );

		IF DATENAME(WEEKDAY,(CAST( CONVERT(VARCHAR(10), @year + '-07-12') AS DATE )) ) = 'Sunday'
			UPDATE DW.dim_date
				SET HolidayText = '12th July roll forward', IsHoliday = 1
			WHERE [Date] = CAST( CONVERT(VARCHAR(10), @year + '-07-13') AS DATE );

		IF DATENAME(WEEKDAY,(CAST( CONVERT(VARCHAR(10), @year + '-07-12') AS DATE )) ) = 'Saturday'
			UPDATE DW.dim_date
				SET HolidayText = '12th July roll forward', IsHoliday = 1
			WHERE [Date] = CAST( CONVERT(VARCHAR(10), @year + '-07-14') AS DATE );


	-- Good Friday
		UPDATE DW.dim_date
			SET HolidayText = 'Good Friday', IsHoliday = 1
		WHERE [Date] = DW.GetGoodFriday(@year);

	-- Easter Monday
		UPDATE DW.dim_date
			SET HolidayText = 'Easter Monday', IsHoliday = 1
		WHERE [Date] = DW.GetEasterMonday(@year);

	-- Early May Bank Holiday
	   UPDATE DW.dim_date
			SET HolidayText = 'Early May Bank Holiday', IsHoliday = 1
		WHERE [Date] = DW.GetEarlyMayBankHoliday(@year);

	-- Spring Spring Holiday
		UPDATE DW.dim_date
			SET HolidayText = 'Spring Bank Holiday', IsHoliday = 1
		WHERE [Date] = DW.GetSpringBankHoliday(@year);

	-- Summer Bank Holiday
		UPDATE DW.dim_date
			SET HolidayText = 'Summer Bank Holiday', IsHoliday = 1
		WHERE [Date] = DW.GetSummerBankHoliday(@year);

	--Christmas
		UPDATE DW.dim_date
			SET HolidayText = 'Christmas Day', IsHoliday = 1
		WHERE [Date] = CAST( CONVERT(VARCHAR(10), @year + '-12-25') AS DATE );

		IF DATENAME(WEEKDAY,(CAST( CONVERT(VARCHAR(10), @year + '-12-25') AS DATE )) ) = 'Sunday'
			UPDATE DW.dim_date
				SET HolidayText = 'Christmas Day roll forward', IsHoliday = 1
			WHERE [Date] = CAST( CONVERT(VARCHAR(10), @year + '-12-26') AS DATE );

		IF DATENAME(WEEKDAY,(CAST( CONVERT(VARCHAR(10), @year + '-12-25') AS DATE )) ) = 'Saturday'
			UPDATE DW.dim_date
				SET HolidayText = 'Christmas Day roll forward', IsHoliday = 1
			WHERE [Date] = CAST( CONVERT(VARCHAR(10), @year + '-12-27') AS DATE );

	-- Boxing Day
		UPDATE DW.dim_date
			SET HolidayText = 'Boxing Day', IsHoliday = 1
		WHERE [Date] = CAST( CONVERT(VARCHAR(10), @year + '-12-26') AS DATE );

		IF DATENAME(WEEKDAY,(CAST( CONVERT(VARCHAR(10), @year + '-12-26') AS DATE )) ) IN('Saturday', 'Sunday')
			UPDATE DW.dim_date
				SET HolidayText = 'Boxing Day roll forward', IsHoliday = 1
			WHERE [Date] = CAST( CONVERT(VARCHAR(10), @year + '-12-28') AS DATE );

		UPDATE DW.dim_date
			SET IsHoliday = 0
		WHERE [Year] = @year
		AND IsHoliday IS NULL;

END;
GO
```

Runs through a loop for each day in a given year and populates the Dimension. Then goes back over the table and labels Week Days vs Weekends (assumes SAT & SUN are weekend for UK). Also calls each function mentioned above to create the holidays and also identifies any holiday on a Sat or Sun and creates a holiday for the following Monday.
