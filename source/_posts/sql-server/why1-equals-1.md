---
title: "Why 'WHERE 1=1'?"
date: "2020-02-12"
tags: [SQL]
categories: [SQL Server]
---

Have you ever seen code like this:

```sql
SELECT
      A
    , B
    , C
FROM TabA
WHERE 1=1
AND A = 'Foo'
AND B = 'Bar'
```

The simple answer is that, this is just for some lazy debugging.

Let's say you have the similar code:

```sql
SELECT
      A
    , B
    , C
FROM TabA
WHERE A = 'Foo'
AND B = 'Bar'
```

and you briefly want to ignore the first filter "A = 'Foo'" for testing purposes. You would end up with

```sql
SELECT
      A
    , B
    , C
FROM TabA
--WHERE A = 'Foo'
WHERE B = 'Bar'
```

Notice that the 'WHERE' line was commented out and therefore the next 'AND' needs to turn in a 'WHERE' to allow the syntax to remain correct.

As a result a number of developers will always make the WHERE clause 'WHERE 1=1' to avoid ever needing to comment it out and therefore never needing to change the next 'AND' to 'WHERE'.
