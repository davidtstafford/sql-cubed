---
title: "Left function with Charindex"
date: "2020-02-11"
tags: [SQL]
categories: [SQL Server]
---

Let's suppose you have a basic hierarchy represented in a string. e.g.

**Top|Middle|Bottom**

You are only interested in retrieving the first part of the string/hierarchy, you could use the following functions:

- CHARINDEX - Find the position of a character
- LEFT return 'n' numbers of characters of the left hand side of a string

Here is some sample code to show how this would work:

```sql
DECLARE @string VARCHAR(200);

--Example 1 -- String with two pipes
SET @string = 'Top|Middle|Bottom*';
SELECT LEFT(@string,CHARINDEX('|', @string + '|')-1)

--RETURNS : Top

--Example 2-- String with no pipes
SET @string = 'TopMiddleBottom*';
SELECT LEFT(@string,CHARINDEX('|', @string + '|')-1)

--RETURNS : TopMiddleBottom  -- As there are no pipes
```

We are looking for the first occurrence of '|' and then use the left function to pull everything before that character.

_We have added a '|' to the end of the string, in case there is no '|'. This will stop an error on the LEFT function trying to read to -1 places._
