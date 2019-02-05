---
title: Cypher Coalesce Nodes
date: "2019-02-05"
category: "Graph"
---

> Cypher Coalesce Nodes

Sorry that i have been so late in writing this one.  I've been working on doing a Kafka/Neo blog, and intend to bring something out soon.  In the meantime, I'll share this little tip on using coalese to pick between two nodes.

In the SQL world, IsNull and Coalesce can come is useful in the correct occassions.  In cyhper you can take it that one step futher and coalesce a whole node.

Example:

Lets say you you have a __Games__ node which belongs to a category.

E.G. 
```sql
(:Game {Title: 'Call Of Duty: Black Ops 4'})-[:CategorisedAs]->(:Type {Type: 'FPS'})
```
Now lets say someone **poorly** implements a child of this:
```sql
(:MiniGame {Title 'Call of Duty: Black Ops 4 - Battle Royal'}) - [:PartOf] -> (:Game {Title: 'Call Of Duty: Black Ops 4'})
```

So we can deduce that Battle Royal which is part of COD is therefore a First Person Shooter.  But to determine this we need to traverse through the main game relationship..

Now lets say again, someone implements a __label__ to make Games and MiniGames appear as one ... so now all MiniGames can also be called **Game**s.

So now we have the scenerio:
```sql
('Call of Duty: Black Ops 4 - Battle Royal')-[:PartOf]->('Call Of Duty: Black Ops 4')-[CategorisedAs]->(FPS)
```

Now, if we queried by lables:
```sql
Match (g:Game)-[CategorisedAs]->(t:Type)
```
It would only return : "Call Of Duty: Black Ops 4" and not "Call of Duty: Black Ops 4 - Battle Royal"

```sql
Match (g:Game) Optional Match (g) - [c:CategorisedAs] -> (t:Type)
```
Would return "Call Of Duty: Black Ops 4" as an "FPS" and "Call of Duty: Black Ops 4 - Battle Royal" with no mapping

This is where the coalesce can come in useful:

```sql
MATCH (g:Game)
OPTIONAL MATCH (g)-[:PartOf]->(pg:Game)
WITH COALESCE(pg,g) AS MainGame, g AS Game
    MATCH (MainGame)-[c:CategorisedAs]->(t:Type)
RETURN Game.Title, t.Type
```

So in this case.<br>
If the optional match is true, then the game must have a parent and therefore the parent is the one with the Type.<br>
If the optional match is false, then the game is the main game and therefore, already maps to Type.

By using the coalesce of the nodes we can take those two pieces of logic and combine them to find the Type whether it is the Parent of the Child, without caring.

I know that this is nowhere near a real world example, but it does show you some of the powers that can be achieved with using COALSCE over nodes.