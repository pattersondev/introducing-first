package db

import (
	"context"
	"database/sql"
	"log"
	"os"

	"fmt"

	_ "github.com/lib/pq"
)

var usersDb *sql.DB

func StartUsersDbConnection() *sql.DB {
	connStr := os.Getenv("USERS_CONNECTION_STRING")

	var err error
	usersDb, err = sql.Open("postgres", connStr)
	if err != nil {
		log.Fatalf("Error opening database connection: %v", err)
	}

	err = usersDb.Ping()
	if err != nil {
		log.Fatalf("Error pinging database: %v", err)
	}

	return usersDb
}

func InsertUser(username string, hashed_password string, email string) error {
	sqlStatement := "INSERT INTO users (username, password_hash, email) VALUES ($1, $2, $3);"
	_, err := usersDb.ExecContext(context.Background(), sqlStatement, username, hashed_password, email)
	if err != nil {
		return fmt.Errorf("unable to insert user with username %s: %w", username, err)
	}

	return nil
}

// get hp given a username
func SelectHP(username string) (string, error) {
	var storedHashedPassword string
	sqlStatement := "SELECT password_hash FROM users WHERE username = $1;"
	err := usersDb.QueryRow(sqlStatement, username).Scan(&storedHashedPassword)
	if err != nil {
		return "", fmt.Errorf("unable to retrieve user with username %s: %w", username, err)
	}
	return storedHashedPassword, nil
}
