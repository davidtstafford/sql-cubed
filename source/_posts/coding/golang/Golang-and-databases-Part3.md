---
title: "Golang and Databases - Part 3"
date: "2019-06-08"
tags: [golang, db-services, coding]
categories: 
	- [Coding - golang]
---

# Details

I will cover applying some clean architecture to my prior post

> This is not the final solution but a journey towards it and I will continue with each post.

From this point on though, I will reference my [github project](https://github.com/davidtstafford/golang-doggos/tree/blog-post-3)

> **SHOUT OUT** - A lot of inspiration came from this github account [corylanou](https://github.com/corylanou/tns-restful-json-api)

# Code changes

> Before I go any further. There are many different methods for clean architecture and numerous blogs, sites, books etc. that go into great detail. some examples would be DDD (domain driven design), "The Ben Johnson way", "The Bill Kennedy way, POD (Package Oriented Design). Frankly, the list is ever growing, and I don't plan to push you down any particular route. Follow what works for you and/or your company. The important thing is that your code: doesn't become overly complicated; parts can be swapped out with ease, a separation between business domains .... and I guess you get where i'm going with this.

> Also, the main.go file will be radically changed by the end, so don't worry too much about it during the refactor process.

# Model

So the first thing I'll focus on, is to pull out the structs that define the data model. By pulling them out it allows them to be decoupled from the main logic and from the database logic.

Let's mess around with the directory structure a bit and create a models folder and create a file **doggos.go**. So you should end up with somethings like this:

```
/ models
    - doggos.go
- main.go
- go.mod
- go.sum
```

Migrate the code

```go
type Doggo struct {
	ID    string `json:"ID"`
	Name  string `json:"Name"`
	Breed string `json:"Breed"`
}

type Doggos []Doggo
```

Of course this won't do much on it's own. It needs some fluff at the start. Now that code has been separated we need to expose the model. The entire doggos.go will look like this:

```go
package models

func Main() *Doggos {
	return &Doggos{}
}

type Doggo struct {
	ID    string `json:"ID"`
	Name  string `json:"Name"`
	Breed string `json:"Breed"`
}

type Doggos []Doggo
```

Note that I have changed the package name of this to be **models** .. This will decouple it from the main package and therefore would need to be imported to be used. The function will return a pointer to the array of type Doggo.

# Repositories (DB connections)

Now bare with me for a while on this one. I am going to pull out the DB logic and create a new directory structure and a few new files. I'll be creating a repositories and postgres folder, and repositories.go and postgres.go file. So you should end up with somethings like this:

```
/ models
    - doggos.go
/ repositories
    / postgres
        - postgres.go
    - repositories.go
- main.go
- go.mod
- go.sum
```

# repositories.go / interface

The repositories.go file, is a very simplistic file that holds an interface to describe the access methods for the model we have just created. In this file we will create our first import to pull in the model.

The entire code will be:

```go
package repositories

import (
	"github.com/davidtstafford/golang-doggos/models"
)

type DBClient interface {
	GetDoggos() (*models.Doggos, error)
	WriteDoggo(doggo *models.Doggo) error
	DeleteDoggo(doggo *models.Doggo) error
}
```

Again we have a different package name, which will be imported at a later date.

Notice that I am created the import `github.com/davidtstafford/golang-doggos/models`. My main modeule is now `module github.com/davidtstafford/golang-doggos` and defined in the go.mod file. It is within my github space and "models" has been created within it.

The **DBClient** interface describes the three functions that would be used to interact with the Doggo db model defined within the models package (models.go)

So we have now defined a client that provides three interface functions:

1. GetDoggos will return the defined array of Doggos in the model.
2. WriteDoggo will take in a defined doggo from the model and will write it.
3. DeleteDoggo will take in a defined doggo from the model and will delete it.

All of these functions can return an error

# The client / postgres.go

The majority of the following code is a refactor of the database code from the prior main.go file.

Fluff at the start:

```go
package postgres

import (
	"database/sql"
	"fmt"
	"os"

	// Used in conjunction with database/sql" to provide Postgres driver
	_ "github.com/lib/pq"

	"github.com/davidtstafford/golang-doggos/models"
	repo "github.com/davidtstafford/golang-doggos/repositories"
)

var (
	host     string
	port     string
	user     string
	password string
	dbname   string
)

type postgresRepo struct {
	client *sql.DB
}
```

Most of this you should recognise already. The differences so far are: imported the models and repositories and created a struct to represent the client.

# New Client function

```go
func NewClient() (repo.DBClient, error) {
	loadOSEnvs()

	psqlInfo := fmt.Sprintf("host=%s port=%s user=%s password=%s dbname=%s sslmode=disable", host, port, user, password, dbname)

	db, err := sql.Open("postgres", psqlInfo)
	if err != nil {
		return nil, err
	}

	err = db.Ping()
	if err != nil {
		return nil, err
	}

	return &postgresRepo{client: db}, nil
}

func loadOSEnvs() {
	host = os.Getenv("pgHost")
	port = os.Getenv("pgPort")
	user = os.Getenv("pgUser")
	password = os.Getenv("pgPassword")
	dbname = os.Getenv("pgDbName")
}
```

You will have seen nearly all of this code in my prior posts. The new aspects are the func itself `func NewClient() (repo.DBClient, error)` and therefore it's return `return &postgresRepo{client: db}, nil`. I think the easiest way to explain what's happening here is: This method is returning back a Database Client which will allow packages to interact with it. In my dabbling C# days this was similar to me providing something that can be instantiated. Therefore at a later stage we'll be able to build another package add something like

```go
dbclient, err := postgres.NewClient()
if err != nil
{
    //Oh no .. code went kaboom
}
// Then invoke some function eg....
dbclient.WriteSomeDataToDoggo(SomeDoggoData)
```

# Get function

This is a new chunk of code. There's nothing especially magic about it, but I figured it made sense to have a simple method that churns out all the doggos in the database. So here's the code

```go
func (repo *postgresRepo) GetDoggos() (*models.Doggos, error) {

	doggo := models.Doggo{}
	doggoList := make(models.Doggos, 0)

	rows, err := repo.client.Query(`select "ID", "Name", "Breed" from demo.doggos`)
	if err != nil {
		return nil, err
	}

	for rows.Next() {
		err := rows.Scan(&doggo.ID, &doggo.Name, &doggo.Breed)
		if err != nil {
			return nil, err
		}
		doggoList = append(doggoList, doggo)
	}
	err = rows.Err()
	if err != nil {
		return nil, err
	}

	repo.client.Close()

	return &doggoList, nil
}
```

Im not going to go into every line as hopefully most of it is obvious, but here's a run down of some of the lines:

- `(repo *postgresRepo) GetDoggos() (*models.Doggos, error)`
- - As mentioned before, the DBClient will be instantiated. That is the 'repo' variable. Func is called 'GetDoggos' and it will return an array of Doggos as defined in the model file and will also return an error if there is one
- `doggo := models.Doggo{}`
- - Creates a placeholder variable for an empty doggo row
- `doggoList := make(models.Doggos, 0)`
- - Creates a placeholder variable for an empty set (array) of doggos
- Doggos are then read, and add to the array 1 by 1 (not the most efficient method, but for this demo, it does the job)
- DB connection closed
- Array is returned

# Write & Delete functions

Self explanatory. So here is the code with zero explanation ;)

```go
func (repo *postgresRepo) WriteDoggo(doggo *models.Doggo) error {

	sqlStatement := `INSERT INTO demo.doggos ("ID", "Name", "Breed" ) VALUES ($1, $2, $3)`
	_, err := repo.client.Exec(sqlStatement, &doggo.ID, &doggo.Name, &doggo.Breed)
	if err != nil {
		return err
	}

	return nil
}

func (repo *postgresRepo) DeleteDoggo(doggo *models.Doggo) error {

	sqlStatement := `DELETE FROM demo.doggos WHERE "ID" = $1`
	_, err := repo.client.Exec(sqlStatement, &doggo.ID)
	if err != nil {
		return err
	}

	return nil
}
```

# Routes

In my previous post I had only two routes and therefore had this code:

```go
    router := mux.NewRouter().StrictSlash(true)
	router.HandleFunc("/", indexPage)
	router.HandleFunc("/create-and-return-doggo", dbstuff)
```

It did the job, but we could make it cleaner. If we imagine that there there are multiple methods then we're going to still end up with a main piece of execution logic that's going to have numerous lines of code to perform the routing. So let's strip this out and create two more files at the top level, router.go and routes.go. So you should end up with somethings like this:

```
/ models
    - doggos.go
/ repositories
    / postgres
        - postgres.go
    - repositories.go
- main.go
- go.mod
- go.sum
- router.go
- routes.go
```

In a similar fashion to the the model, we are extracting this logic into a separate file, however on this occasion it is still going to be tied into the main package.

The routes file will have the following code:

```go
package main

import "net/http"

type Route struct {
Name        string
Method      string
Pattern     string
HandlerFunc http.HandlerFunc
}

type Routes []Route

var routes = Routes{
Route{
	"DoggoIndex",
	"GET",
	"/Doggos",
	DoggoIndex,
},
Route{
	"DoggoCreate",
	"POST",
	"/Doggos",
	AddDoggo,
},
Route{
	"DoggoDelete",
	"DELETE",
	"/Doggos",
	DeleteDoggo,
},
}
```

1.  We import 'net/http' for the http handler logic
2.  We create a struct to represent a route.. A name, rest method, URL extension and the func that it will call (route to)
3.  Finally we create the three routes that represent our three methods for Get, Write and Delete ..

In the future we could add many more .. one example could be

```go
Route{
	"GetDoggoByID",
	"GET",
	"/Doggos/{DoggoId}",
	GetDoggo,
},
```

This would look up a particular row with the given ID. That's one for a future post.

Now we need to add the actual router logic again using mux as we did last time. So the following code will be added to the router.go file:

```go
package main

import (
	"net/http"

	"github.com/gorilla/mux"
)

func NewRouter() *mux.Router {
	router := mux.NewRouter().StrictSlash(true)
	for _, route := range routes {
		var handler http.Handler

		handler = route.HandlerFunc

		router.
			Methods(route.Method).
			Path(route.Pattern).
			Name(route.Name).
			Handler(handler)

	}
	return router
}
```

Using Mux, for each of the routes that we previously created, we are now actually creating the router. You may be wondering what these routes are actually pointing to though. DoggoIndex, AddDoggo, DeleteDoggo don't actually exists as functions. In fact, there is no logic that sits between the router and the DB calls. This is where the handlers come in. ->

#Handlers

Time to create another file at the top level. handlers.go. So you should end up with somethings like this:

```
/ models
    - doggos.go
/ repositories
    / postgres
        - postgres.go
    - repositories.go
- main.go
- go.mod
- go.sum
- router.go
- routes.go
- handlers.go
```

I've added the following code to it:

```go
package main

import (
	"encoding/json"
	"fmt"
	"io"
	"io/ioutil"
	"net/http"

	mo "github.com/davidtstafford/golang-doggos/models"
	repo "github.com/davidtstafford/golang-doggos/repositories/postgres"
)

func DoggoIndex(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json; charset=UTF-8")
	dbClient, _ := repo.NewClient()

	doggoList, _ := dbClient.GetDoggos()

	if err := json.NewEncoder(w).Encode(doggoList); err != nil {
		panic(err)
	}
	w.WriteHeader(http.StatusOK)
}

func AddDoggo(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json; charset=UTF-8")
	dbClient, _ := repo.NewClient()
	doggo := &mo.Doggo{}
	body, err := ioutil.ReadAll(io.LimitReader(r.Body, 1048576))

	fmt.Println(body)

	if err != nil {
		panic(err)
	}
	if err := r.Body.Close(); err != nil {
		panic(err)
	}
	if err := json.Unmarshal(body, doggo); err != nil {
		w.WriteHeader(http.StatusUnprocessableEntity)
		if err := json.NewEncoder(w).Encode(err); err != nil {
			panic(err)
		}
	}

	err = dbClient.WriteDoggo(doggo)
	if err != nil {
		panic(err)
	}
	w.WriteHeader(http.StatusOK)
}

func DeleteDoggo(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json; charset=UTF-8")
	dbClient, _ := repo.NewClient()
	doggo := &mo.Doggo{}
	body, err := ioutil.ReadAll(io.LimitReader(r.Body, 1048576))

	fmt.Println(body)

	if err != nil {
		panic(err)
	}
	if err := r.Body.Close(); err != nil {
		panic(err)
	}
	if err := json.Unmarshal(body, doggo); err != nil {
		w.WriteHeader(http.StatusUnprocessableEntity)
		if err := json.NewEncoder(w).Encode(err); err != nil {
			panic(err)
		}
	}

	err = dbClient.DeleteDoggo(doggo)
	if err != nil {
		panic(err)
	}

	w.WriteHeader(http.StatusOK)
}
```

I'm being a bit lazy here and not breaking down the code. You may also notice that I could have done a much better job and handling and reporting errors.

Looking at the code then:

1. The imports contain a reference to models and postgres (and remember the routers are part of the same package). Therefore, everything is now brought together
2. All funcs do a similar thing. They will init to Database Client and then call its relevant function and the handler returns the data.
3. For DoggoIndex, it will push the output of an array of doggos into json and write it
4. For AddDoggo, it will take the doggo object and pass it onto the client. Once written it will return the success
5. For DeleteDoggo, it will take the doggo object and pass it onto the client. Once deleted it will return the success

It may look complicated but it is relatively straight forward.

# Main

Finally the main file.

Here's the code:

```go
package main

import (
	"log"
	"net/http"
)

func main() {
	router := NewRouter()
	log.Fatal(http.ListenAndServe(":7000", router))
}
```

That's what happens well all the rest of the code is moved else where. ;)

Time to build

# Output

We have three http methods that we can can. I'll use the following example:

```bash
curl http://localhost:7000/Doggos -X GET

curl http://localhost:7000/Doggos -X POST -d '{"ID":"1", "Name":"Blake", "Breed":"Pug"}'
curl http://localhost:7000/Doggos -X POST -d '{"ID":"2", "Name":"Patch", "Breed":"Lab"}'
curl http://localhost:7000/Doggos -X POST -d '{"ID":"3", "Name":"Rosie", "Breed":"Terrier"}'

curl http://localhost:7000/Doggos -X GET

curl http://localhost:7000/Doggos -X DELETE -d '{"ID":"2"}'

curl http://localhost:7000/Doggos -X GET
```

The will show us the blank collection at the start. Then adding three doggos and then removing one.

.. and here's my output (note I piped the output json to format it)

![image](part3-1.png)

# Up Next

I have a few things that i still need to show:

- Logging
- Better error handling (e.g. I forgot to export my envs and was running around in circles for a while whilst making this)
- Unit Tests
- Showing how to swap out databases .. eg going from postgres to dynamo

More than likely my next post will apply basic logging on the http side and I'll show how the clean architecture makes it very easy to swap databases.
