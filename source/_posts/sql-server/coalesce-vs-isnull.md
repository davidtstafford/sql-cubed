---
title: "Coalesce vs IsNull"
date: "2018-11-04"
tags: [SQL]
categories: [SQL Server]
---

So, this is a bit of a fun short topic. In the past when I have interviewed for Senior SQL Server Developer roles, I have included the following question:

What will the output of the following code be? -

```sql
DECLARE @X CHAR(3) = NULL;
SELECT IsNull(@X, 'Empty');
SELECT COALESCE(@X, 'Empty');
```

Very few people have got the answer, and frankly, that's ok. It's not the sort of thing one would know, unless they've stumbled upon it. Whether they get it correct or not, it brings about an interesting topic around performance.

Firstly the answer is:

```sql
DECLARE @X CHAR(3) = NULL;
SELECT IsNull(@X, 'Empty'); -- 'Emp'
SELECT COALESCE(@X, 'Empty'); -- 'Empty'
```

For those that haven't stumbled upon this. The IsNull function will interpret the Data Type and Length of the first value, whilst the Coalesce can evaluate each Data Type and Length.
Therefore, for IsNull, the String 'Empty' will be truncated to 3 characters ('Emp') as @X is only a CHAR(3), whilst for Coalesce, the String 'Empty' will be returned as is.

Why? - Simple.. Coalesce is treated like a CASE Statement whilst IsNull is an internal T-sql function.

So the fun aspect of the question can be in the understanding how the different functions can affect the output, primarily the Data Length.

The interesting aspect is in the understanding of the performance implications. Many times I have seen code that uses Coalesce, despite there only being one field being evaluated. In this case it would be generally more preformant to use IsNull as it will result in a single pass rather than multiple passes, by treating the function in a similar manner to a CASE statement.

I'll leave it at that, as I'm sure many other people have documented the hell out of this topic, but I am always surprised at the number of SQL Server devs who haven't encountered it. The geek in me finds it fascinating.
