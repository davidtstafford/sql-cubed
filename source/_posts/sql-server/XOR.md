---
title: "XOR - Bitwise exclusive OR"
date: "2020-02-20"
tags: [SQL]
categories: [SQL Server]
---

There are a number of bitwise functions in sql server: AND; OR; Exclusive OR; NOT.

For this topic I will be giving a working example of using an "Exclusive OR".

Firstly lets understand what a bitwise exclusive or operation does:

**XOR**

| LEFT Flag | Right Flag | Result |
| --------- | ---------- | ------ |
| True      | True       | False  |
| False     | True       | True   |
| True      | False      | True   |
| False     | False      | False  |

So a normal 'OR' would return TRUE if: 1) Both Sides are true; 2) one side is true. The difference for XOR is that if both sides are true then the result is false. Another way to think is that it is an 'OR' minus an 'AND'.

We can also look at the binary representation of this. Courtesy of MS Docs:

```
LEFT         0000 0000 1010 1010
RIGHT        0000 0000 0100 1011
             -------------------
RESULT       0000 0000 1110 0001
```

Throughout my experience I have very rarely since this logic used, but as always there will be occasions where these functions are useful.

Take the following example. Suppose you want to compare two tables to see if something has changed:

```sql

--Source table (Incoming data)
CREATE Table1
(
          Col1 VARCHAR(10)
        , Col2 VARCHAR(10)
);

INSERT INTO Table1
VALUES
    ('Foo','Bar')
;

--Target table (Data that might be updated)
CREATE Table2
(
          ID INT IDENTITY(1,1)
        , Col1 VARCHAR(10)
        , Col2 VARCHAR(10)
);

INSERT INTO Table2
VALUES
    ('Foo',NULL)
;

--Table to record what will be changed
CREATE TABLE Updates
(
          ID INT
        , Col1 VARCHAR(10)
        , Col2 VARCHAR(10)
)
```

So if you want to record what will be changed on Table2 into Updates. You could run the following:

```sql
with x
as
(
    SELECT T2.ID, T1.Col1, T1.Col2
    FROM Table1 T1-- Source
        INNER JOIN Table2 T2 --Target
            ON T1.Col1 != T2.Col1 OR (T1.Col1 IS NULL AND T2.Col1 IS NULL)
    WHERE (ISNULL(T1.Col2,'') != ISNULL(T2.Col2,''))
)
INSERT INTO updates
SELECT * FROM x
;
```

This is fairly typical. **Note** As most experienced SQL devs know, NULLS are our bane of existence. If something can be NULL and it needs to be compared, then you need to protect against it. ie WHERE NULL = NULL is false and NULL != NULL is false, because by default NULLS cannot be compared. So you either SET ANSI_NULLS OFF (which is due to be depreciated), or you replace the NULLS on both sides, as done above.

Now imagine that you cannot replace the NULL with values on both sides. So in this case you are not allowed to use `ISNULL(T1.Col2,'') != ISNULL(T2.Col2,'')`. It would then not be possible to compare `T1.Col1 != T2.Col1` if either side is NULL.

So `T1.Col2 != T2.Col2` will capture any differences that don't contain nulls, so we need to do something like `T1.Col2 != T2.Col2 OR (T1.Col2 IS NULL XOR T2.Col2 IS NULL)`. The important addition to this is `T1.Col2 IS NULL XOR T2.Col2 IS NULL`. What this means is. If either T1.Col2 is NULL Or T2.Col2 IS NULL, but BOTH are not NULL.
i.e.

| T1.COL2  | T2.Col2  | Result |
| -------- | -------- | ------ |
| NULL     | NULL     | False  |
| NULL     | NOT NULL | True   |
| NOT NULL | NULL     | True   |
| NOT NULL | NOT NULL | N/A    |

**N/A** The NOT NULL AND NOT NULL logic would never occur as that would be captured by the `T1.Col1 != T2.Col1` side of `T1.Col2 != T2.Col2 OR (T1.Col2 IS NULL XOR T2.Col2 IS NULL)`

Before we look at fixing the where clause we will replicate the table above:

```sql
DECLARE @T1_COL2 VARCHAR(10), @T2_COL2 VARCHAR(10);

SELECT
      T1bool = CASE WHEN @T1_COL2 IS NULL THEN 1 ELSE 0 END
    , T2bool = CASE WHEN @T2_COL2 IS NULL THEN 1 ELSE 0 END
    , Result = CASE WHEN @T1_COL2 IS NULL THEN 1 ELSE 0 END ^ CASE WHEN @T2_COL2 IS NULL THEN 1 ELSE 0 END;

/*
RESULT

     T1bool   T2bool   Result
     1        1        0
*/



SELECT @T1_COL2 ='BAR', @T2_COL2 = NULL;

SELECT
      T1bool = CASE WHEN @T1_COL2 IS NULL THEN 1 ELSE 0 END
    , T2bool = CASE WHEN @T2_COL2 IS NULL THEN 1 ELSE 0 END
    , Result = CASE WHEN @T1_COL2 IS NULL THEN 1 ELSE 0 END ^ CASE WHEN @T2_COL2 IS NULL THEN 1 ELSE 0 END;


/*
RESULT

     T1bool   T2bool   Result
     0        1        1
*/



SELECT @T1_COL2 =NULL, @T2_COL2 = 'BAR';

SELECT
      T1bool = CASE WHEN @T1_COL2 IS NULL THEN 1 ELSE 0 END
    , T2bool = CASE WHEN @T2_COL2 IS NULL THEN 1 ELSE 0 END
    , Result = CASE WHEN @T1_COL2 IS NULL THEN 1 ELSE 0 END ^ CASE WHEN @T2_COL2 IS NULL THEN 1 ELSE 0 END;


/*
RESULT

     T1bool   T2bool   Result
     1        0        1
*/

```

So we can see that the sql code `CASE WHEN @T1_COL2 IS NULL THEN 1 ELSE 0 END ^ CASE WHEN @T2_COL2 IS NULL THEN 1 ELSE 0 END` will equal '1' if either T1.Col2 is NULL or T2.Col2 is NULL but NOT both.

Therefore the original piece of SQL can become:

```sql
with x
as
(
    SELECT T2.ID, T1.Col1, T1.Col2
    FROM Table1 T1-- Source
        INNER JOIN Table2 T2 --Target
            ON T1.Col1 != T2.Col1 OR (T1.Col1 IS NULL AND T2.Col1 IS NULL)
    WHERE (CASE WHEN @T1_COL2 IS NULL THEN 1 ELSE 0 END ^ CASE WHEN @T2_COL2 IS NULL THEN 1 ELSE 0 END) = 1
)
INSERT INTO updates
SELECT * FROM x
;
```
