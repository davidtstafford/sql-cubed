---
title: "Golang and Databases - Part 2"
date: "2019-06-01"
tags: [golang, db-services, coding]
categories: 
	- [Coding -> golang]
---

# Details

I will cover converting the previous code into a simple http endpoint that executes and returns the output.

> This is not the final solution but a journey towards it and I will continue with each post.

# Code changes

# Rename Main

All of our database logic is currently under the main func, we'll need to replace that. So for now, lets rename **main** to **dbstuff**

```go
...
...
type Doggos []Doggo

func main() {
	loadOSEnvs()

...
...
```

to

```go
...
...
type Doggos []Doggo

func dbstuff() {
	loadOSEnvs()

...
...
```

# Imports

Lets add the following:

- "net/http"

This will provide us with the needed logic do http logic

```go
import (
	"database/sql"
	"fmt"
	"os"
	"log"

	// Used in conjunction with database/sql" to provide Postgres driver
	_ "github.com/lib/pq"
)
```

to

```go
import (
	"database/sql"
	"fmt"
	"os"
	"log"

	"net/http"

	// Used in conjunction with database/sql" to provide Postgres driver
	_ "github.com/lib/pq"
)
```

# New main func

```go
func main() {
    http.HandleFunc("/", func(w http.ResponseWriter, r *http.Request) {
        fmt.Fprintln(w, "Hello Doggo World!")
    })

    log.Fatal(http.ListenAndServe(":8080", nil))
}
```

This new main func will create a simple index page **"/"**, and write `Hello Doggo World!` to it. It will then start the service up.

We can test this out by running the following in the command line

```bash
go run .
```

The terminal prompt wont return as it's now staying open to host the http service. Open up http://localhost:8080/ in your browser and you should see:

![image](part2-1.png)

Not earth shattering, but we now do have some sort of endpoint ;)

# Mux (github.com/gorilla/mux)

So now we want to set up some route logic. i.e. We want to expose an endpoint that actually executes our dbstuff func, rather than attempting to write all of the routing logic ourselves, there is a third party library `github.com/gorilla/mux` that does a great job at this.

So firstly, added it to the imports:

```go
import (
	"database/sql"
	"fmt"
	"os"
	"log"

	"net/http"
	"github.com/gorilla/mux"

	// Used in conjunction with database/sql" to provide Postgres driver
	_ "github.com/lib/pq"
)
```

Now lets test it out by creating an indexPage func to represent the homepage and get mux to handle the routing.

Time to refactor the main func slightly:

```go
func main() {

    router := mux.NewRouter().StrictSlash(true)
	router.HandleFunc("/", indexPage)

    log.Fatal(http.ListenAndServe(":8080", router))
}
```

So rather than creating **Hello Doggo World** in the main func, mux will provide a route to the indexPage func whenever someone hits the "/" endpoint.

So let's create the indexPage func:

```go
func indexPage(w http.ResponseWriter, r *http.Request) {
    fmt.Fprintln(w, "Hello Doggo World!")
}
```

This is the original code from the old main but now sits within its own func.

As we did it before, to test it out

```bash
go run .
```

The terminal prompt won't return as it's now staying open to host the http service. Open up http://localhost:8080/ in your browser and you should still see:
![image](part2-1.png)

> We can also hit this from curl. From here on it, I'll be using curl, as we aren't creating a website.
> e.g.
>
> ```bash
> >curl http://localhost:8080/
> Hello Doggo World!
> ```

# Calling the db func

Time to add another handler to the main func

```go
func main() {

    router := mux.NewRouter().StrictSlash(true)
	router.HandleFunc("/", indexPage)
	router.HandleFunc("/create-and-return-doggo", dbstuff)

    log.Fatal(http.ListenAndServe(":8080", router))
}
```

We'll also need amend the the dbstuff func to accept an http writer and request. And finally, make use of the writer to respond with the doog that's been created:

```bash
func dbstuff() {
```

to

```bash
func dbstuff(w http.ResponseWriter, r *http.Request) {
```

and add `fmt.Fprintln(w, doggoList)` to the end of that dbstuff func

```bash
...
...

	fmt.Println(doggoList)
	fmt.Fprintln(w, doggoList)
}
```

# Running the code

Within terminal run the following command

```bash
export pgHost=localhost
export pgPort=5432
export pgUser=postgres
export pgPassword=postgres_docker
export pgDbName=postgres

go run .
```

On a new terminal window run the following

```bash
export pgHost=localhost
export pgPort=5432
export pgUser=postgres
export pgPassword=postgres_docker
export pgDbName=postgres

curl http://localhost:8080/
curl http://localhost:8080/create-and-return-doggo
```

and you should see the following output

![image](part2-2.png)

# Entire code

```go
package main

import (
	"database/sql"
	"fmt"
	"os"
	"log"

	"net/http"
	"github.com/gorilla/mux"

	// Used in conjunction with database/sql" to provide Postgres driver
	_ "github.com/lib/pq"
)

var (
	host     string
	port     string
	user     string
	password string
	dbname   string
)

type Doggo struct {
	ID    string `json:"ID"`
	Name  string `json:"Name"`
	Breed string `json:"Breed"`
}

type Doggos []Doggo

func main() {

    router := mux.NewRouter().StrictSlash(true)
	router.HandleFunc("/", indexPage)
	router.HandleFunc("/create-and-return-doggo", dbstuff)

    log.Fatal(http.ListenAndServe(":8080", router))
}

func indexPage(w http.ResponseWriter, r *http.Request) {
    fmt.Fprintln(w, "Hello Doggo World!")
}

func dbstuff(w http.ResponseWriter, r *http.Request) {
	loadOSEnvs()


	psqlInfo := fmt.Sprintf("host=%s port=%s user=%s password=%s dbname=%s sslmode=disable", host, port, user, password, dbname)

	db, err := sql.Open("postgres", psqlInfo)
	if err != nil {
		fmt.Println(err)
	}

	err = db.Ping()
	if err != nil {
		fmt.Println(err)
	}

	defer db.Close()

	sqlStatement := `TRUNCATE TABLE demo.doggos`
	_, err = db.Exec(sqlStatement)
	if err != nil {
		fmt.Println(err)
	}

	sqlStatement = `INSERT INTO demo.doggos ("ID", "Name", "Breed" ) VALUES (1,'Patch','Lab')`
	_, err = db.Exec(sqlStatement)
	if err != nil {
		fmt.Println(err)
	}




	rows, err := db.Query(`select "ID", "Name", "Breed" from demo.doggos`)
	if err != nil {
		fmt.Println(err)
	}

	doggo := Doggo{}
	doggoList := Doggos{}

	for rows.Next() {
		err := rows.Scan(&doggo.ID, &doggo.Name, &doggo.Breed)
		if err != nil {
			fmt.Println(err)
		}
		doggoList = append(doggoList, doggo)
	}
	err = rows.Err()
	if err != nil {
		fmt.Println(err)
	}

	fmt.Println(doggoList)
	fmt.Fprintln(w, doggoList)
}


func loadOSEnvs() {
	host = os.Getenv("pgHost")
	port = os.Getenv("pgPort")
	user = os.Getenv("pgUser")
	password = os.Getenv("pgPassword")
	dbname = os.Getenv("pgDbName")
}
```

# Coming up directly next

Cleaning the code and following some clean architectures
