---
title: "Deleting duplicates"
metaTitle: "Deleting-Duplicates"
metaDescription: "Using a CTE and row number to delete dups"
date: "2020-02-12"
---

_Publish date: 2020-02-12_

> Deleting duplicates

There will be the odd occasion when you will need to delete duplicates from a table. There are a number of ways that this can be achieved, however I have found that using a CTE and ROW_NUMBER is the shortest to achieve this.

Image you have a table that has no unique identifier / primary key and you have duplicates. You don't care which rows stay, as they are identical, but you do need to remove all but one. The example below will show how the change be achieved:

```sql
CREATE TABLE #CartoonCharacters
(
      FullName  VARCHAR(200)
    , Programme VARCHAR(200)
);

INSERT INTO #CartoonCharacters
VALUES
      ('Homer J Simpson', 'Simpsons')
    , ('Ned Flanders','Simpsons')
    , ('Eric Cartman', 'South Park')
    , ('Peter Griffin', 'Family Guy')
    , ('Peppa Pig', 'Peppa Pig')
    , ('Chase', 'Paw Patrol')
    , ('Homer J Simpson', 'Simpsons') -- Dup
    , ('Peter Griffin', 'Family Guy') -- Dup
;

WITH dups
AS
(
    SELECT
        dupCount = ROW_NUMBER() OVER(PARTITION BY FullName, Programme ORDER BY FullName)
        , *
    FROM #CartoonCharacters
)
DELETE
FROM dups
WHERE dupCount > 1
```

| Dup Counter | Full Name           | Programme      |
| ----------- | ------------------- | -------------- |
| 1           | Chase               | Paw Patrol     |
| 1           | Eric Cartman        | South Park     |
| 1           | Homer J Simpson     | Simpsons       |
| **2**       | **Homer J Simpson** | **Simpsons**   |
| 1           | Ned Flanders        | Simpsons       |
| 1           | Peppa Pig           | Peppa Pig      |
| 1           | Peter Griffin       | Family Guy     |
| **2**       | **Peter Griffin**   | **Family Guy** |

In this example we have two duplicates. By creating a CTE that selects from the #CartoonCharacters table and also selects a row number that represents duplicates, we can delete the duplicate from the CTE which in turn deletes from the underlying table.

**Note** If your system only supported soft deletes you could you the same CTE to run an update rather than hard delete. e.g.

```SQL
WITH dups
AS
(
    SELECT
        dupCount = ROW_NUMBER() OVER(PARTITION BY FullName, Programme ORDER BY FullName)
        , *
    FROM #CartoonCharacters
)
UPDATE dups
    SET IsDeleted = 1
WHERE dupCount > 1
```
