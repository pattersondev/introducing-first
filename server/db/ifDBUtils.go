// ifDBUtils is collection of functions for interacting with main IF DB (fighters, events, etc.)
package db

import (
	"database/sql"
	"log"
	"os"

	_ "github.com/lib/pq"
)

var db *sql.DB

func StartDbConnection() *sql.DB {
	connStr := os.Getenv("CONNECTION_STRING")

	var err error
	db, err = sql.Open("postgres", connStr)
	if err != nil {
		log.Fatalf("Error opening database connection: %v", err)
	}

	err = db.Ping()
	if err != nil {
		log.Fatalf("Error pinging database: %v", err)
	}

	return db
}
