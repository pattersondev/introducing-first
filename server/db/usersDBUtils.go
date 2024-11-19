// usersDBUtils is collection of functions for interacting with main IF DB (fighters, events, etc.)
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

// insert new user into DB
func InsertUser(username string, hashed_password string, email string, phone string) error {
	sqlStatement := "INSERT INTO users (username, password_hash, email, phone_number) VALUES ($1, $2, $3, $4);"
	_, err := usersDb.ExecContext(context.Background(), sqlStatement, username, hashed_password, email, phone)
	if err != nil {
		return fmt.Errorf("unable to insert user with username %s: %w", username, err)
	}

	return nil
}

// get hp given a username
func SelectHP(email string) (string, error) {
	var storedHashedPassword string
	sqlStatement := "SELECT password_hash FROM users WHERE email = $1;"
	err := usersDb.QueryRow(sqlStatement, email).Scan(&storedHashedPassword)
	if err != nil {
		return "", fmt.Errorf("unable to retrieve user with username %s: %w", email, err)
	}
	return storedHashedPassword, nil
}

// checks if user exists (if username or email are already in DB)
func CheckUserExists(username, email string) (bool, bool, error) {
	var existingUsername, existingEmail string

	//checking if username already exists
	usernameQuery := "SELECT username FROM users WHERE username = $1;"
	err := usersDb.QueryRow(usernameQuery, username).Scan(&existingUsername)
	if err != nil && err != sql.ErrNoRows {
		return false, false, fmt.Errorf("error checking username: %w", err)
	}

	//checking if email already exists
	emailQuery := "SELECT email FROM users WHERE email = $1;"
	err = usersDb.QueryRow(emailQuery, email).Scan(&existingEmail)
	if err != nil && err != sql.ErrNoRows {
		return false, false, fmt.Errorf("error checking email: %w", err)
	}

	//returns true if username or email exists
	return existingUsername != "", existingEmail != "", nil
}

// get the user id when given an email
func SelectUserId(email string) (string, error) {
	var userId string
	sqlStatement := "SELECT user_id FROM users WHERE email = $1"
	err := usersDb.QueryRow(sqlStatement, email).Scan(&userId)
	if err != nil {
		return "", fmt.Errorf("error retrieving userId: %v", err)
	}
	return userId, nil
}

// retrieve the username when given an email
func SelectUsername(email string) (string, error) {
	var username string
	sqlStatement := "SELECT username FROM users WHERE email = $1"
	err := usersDb.QueryRow(sqlStatement, email).Scan(&username)
	if err != nil {
		return "", fmt.Errorf("error retrieving username: %v", err)
	}
	return username, nil
}

// Add this new function to retrieve email by user ID
func SelectEmail(userId string) (string, error) {
	var email string
	sqlStatement := "SELECT email FROM users WHERE user_id = $1"
	err := usersDb.QueryRow(sqlStatement, userId).Scan(&email)
	if err != nil {
		return "", fmt.Errorf("error retrieving email: %v", err)
	}
	return email, nil
}

// UpdateProfilePicture updates the user's profile picture URL
func UpdateProfilePicture(userId string, pictureUrl string) error {
	sqlStatement := "UPDATE users SET image_link = $1 WHERE user_id = $2"
	_, err := usersDb.ExecContext(context.Background(), sqlStatement, pictureUrl, userId)
	if err != nil {
		return fmt.Errorf("error updating profile picture: %v", err)
	}
	return nil
}

// GetProfilePicture gets the user's profile picture URL
func GetProfilePicture(userId string) (string, error) {
	var pictureUrl sql.NullString
	sqlStatement := "SELECT image_link FROM users WHERE user_id = $1"
	err := usersDb.QueryRow(sqlStatement, userId).Scan(&pictureUrl)
	if err != nil {
		return "", fmt.Errorf("error retrieving profile picture: %v", err)
	}
	if !pictureUrl.Valid {
		return "", nil
	}
	return pictureUrl.String, nil
}
