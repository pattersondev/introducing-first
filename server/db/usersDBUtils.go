// usersDBUtils is collection of functions for interacting with main IF DB (fighters, events, etc.)
package db

import (
	"context"
	"database/sql"
	"log"
	"os"
	"time"

	"fmt"

	"github.com/google/uuid"
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

// CreatePasswordResetToken creates a new password reset token for a user
func CreatePasswordResetToken(email string) (string, error) {
	// First get the user_id
	var userId string
	err := usersDb.QueryRow("SELECT user_id FROM users WHERE email = $1", email).Scan(&userId)
	if err != nil {
		if err == sql.ErrNoRows {
			return "", fmt.Errorf("user not found")
		}
		return "", fmt.Errorf("error querying user: %v", err)
	}

	// Check for recent reset attempts
	var recentAttempts int
	err = usersDb.QueryRow(`
		SELECT COUNT(*) 
		FROM password_reset_tokens 
		WHERE user_id = $1 
		AND created_at > NOW() - INTERVAL '24 hours'
	`, userId).Scan(&recentAttempts)
	if err != nil {
		log.Printf("Error checking recent attempts: %v", err)
		return "", fmt.Errorf("error checking recent attempts: %v", err)
	}

	log.Printf("Recent attempts for user %s: %d", userId, recentAttempts)

	// Limit to 3 attempts per 24 hours
	if recentAttempts >= 3 {
		log.Printf("Too many reset attempts for user %s (%d attempts)", userId, recentAttempts)
		return "", fmt.Errorf("too many reset attempts. Please try again later")
	}

	// Generate a random token
	token := uuid.New().String()
	expiresAt := time.Now().UTC().Add(1 * time.Hour)

	// Insert new token
	_, err = usersDb.Exec(`
		INSERT INTO password_reset_tokens (user_id, token, expires_at)
		VALUES ($1, $2, $3)
	`, userId, token, expiresAt)

	if err != nil {
		log.Printf("Error creating reset token: %v", err)
		return "", fmt.Errorf("error creating reset token: %v", err)
	}

	log.Printf("Created new reset token for user %s (attempt %d/3)", userId, recentAttempts+1)
	return token, nil
}

// ValidateResetToken checks if a reset token is valid and not expired
func ValidateResetToken(token string) (string, error) {
	var userId int
	var used bool
	var expiresAt time.Time

	log.Printf("Validating token: %s", token)

	err := usersDb.QueryRow(`
		SELECT user_id, used, expires_at 
		FROM password_reset_tokens 
		WHERE token = $1
	`, token).Scan(&userId, &used, &expiresAt)

	if err == sql.ErrNoRows {
		log.Printf("Token not found in database")
		return "", fmt.Errorf("invalid token")
	}
	if err != nil {
		log.Printf("Database error: %v", err)
		return "", err
	}

	log.Printf("Token found - UserID: %d, Used: %v, ExpiresAt: %v", userId, used, expiresAt)

	if used {
		log.Printf("Token has already been used")
		return "", fmt.Errorf("token already used")
	}

	now := time.Now().UTC()
	if now.After(expiresAt) {
		log.Printf("Token has expired. Current time (UTC): %v, Expiry: %v", now, expiresAt)
		return "", fmt.Errorf("token expired")
	}

	return fmt.Sprintf("%d", userId), nil
}

// UpdatePassword updates a user's password and marks the reset token as used
func UpdatePassword(userId string, newPasswordHash string, token string) error {
	tx, err := usersDb.Begin()
	if err != nil {
		log.Printf("Error starting transaction: %v", err)
		return fmt.Errorf("error starting transaction: %v", err)
	}
	defer tx.Rollback()

	// First update password
	result, err := tx.Exec("UPDATE users SET password_hash = $1 WHERE user_id = $2", newPasswordHash, userId)
	if err != nil {
		log.Printf("Error updating password: %v", err)
		return fmt.Errorf("error updating password: %v", err)
	}

	rowsAffected, err := result.RowsAffected()
	if err != nil {
		log.Printf("Error getting rows affected: %v", err)
		return fmt.Errorf("error getting rows affected: %v", err)
	}

	if rowsAffected == 0 {
		log.Printf("No rows updated for userId: %s", userId)
		return fmt.Errorf("user not found with id: %s", userId)
	}

	// Delete any existing used tokens for this user before marking the current one as used
	_, err = tx.Exec("DELETE FROM password_reset_tokens WHERE user_id = $1 AND used = true", userId)
	if err != nil {
		log.Printf("Error deleting old used tokens: %v", err)
		return fmt.Errorf("error cleaning up old tokens: %v", err)
	}

	// Now mark the current token as used
	result, err = tx.Exec("UPDATE password_reset_tokens SET used = true WHERE token = $1", token)
	if err != nil {
		log.Printf("Error marking token as used: %v", err)
		return fmt.Errorf("error marking token as used: %v", err)
	}

	rowsAffected, err = result.RowsAffected()
	if err != nil {
		log.Printf("Error getting rows affected for token update: %v", err)
		return fmt.Errorf("error getting rows affected for token update: %v", err)
	}

	if rowsAffected == 0 {
		log.Printf("No rows updated for token: %s", token)
		return fmt.Errorf("token not found: %s", token)
	}

	if err = tx.Commit(); err != nil {
		log.Printf("Error committing transaction: %v", err)
		return fmt.Errorf("error committing transaction: %v", err)
	}

	return nil
}
