package main

import (
	"fmt"
	"log"
	"net/http"
	"os"

	"server/db"

	"time"

	"net/mail"

	"github.com/golang-jwt/jwt/v4"
	"github.com/joho/godotenv"
	_ "github.com/lib/pq"
	"golang.org/x/crypto/bcrypt"
)

var jwtKey []byte

func main() {

	err := godotenv.Load()
	if err != nil {
		log.Fatalf("Error loading .env file: %v", err)
	}

	//set the jwt key on init
	jwtKey = []byte(os.Getenv("JWT_SECRET"))
	if len(jwtKey) == 0 {
		log.Fatal("JWT_SECRET not set in .env")
	}

	db.StartDbConnection()
	db.StartUsersDbConnection()

	http.HandleFunc("/", handleRoot)
	http.HandleFunc("/hello", handleHello)

	http.HandleFunc("/login", loginHandler)
	http.HandleFunc("/register", registerHandler)
	http.HandleFunc("/logout", logoutHandler)

	//test endpoint. hidden behind authentication. Delete later
	http.HandleFunc("/protected", authenticate(protectedHandler))

	fmt.Println("Server starting on :8080")
	log.Fatal(http.ListenAndServe(":8080", nil))

}

// generates JWT
func generateJWT(username string) (string, error) {
	//token expire time (sets validity to one day after generation for now)
	expirationTime := time.Now().Add(24 * time.Hour)

	//define claims for token (username and expiration date for now)
	claims := &jwt.RegisteredClaims{
		Subject:   username,
		ExpiresAt: jwt.NewNumericDate(expirationTime),
	}

	//create the jwt token with claims defined above
	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	return token.SignedString(jwtKey)
}

// hashes the password
func hashPassword(password string) (string, error) {
	//Hash the password with cost factor of 10
	bytes, err := bcrypt.GenerateFromPassword([]byte(password), 10)
	return string(bytes), err
}

// compare provided password to the hashed password
func checkPasswordHash(password, hash string) bool {
	err := bcrypt.CompareHashAndPassword([]byte(hash), []byte(password))
	return err == nil
}

// check to see if email provided is a real / valid email
func isValidEmail(email string) bool {
	_, err := mail.ParseAddress(email)
	return err == nil
}

// handle registration
func registerHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Invalid request method. Use POST", http.StatusMethodNotAllowed)
		return
	}

	//receive username and password and do basic length check
	username := r.FormValue("username")
	password := r.FormValue("password")
	email := r.FormValue("email")

	//username and password must be atleast 8 characters long and email must be valid
	if len(username) < 8 || len(password) < 8 || !isValidEmail(email) {
		er := http.StatusNotAcceptable
		http.Error(w, "Invalid Username/Password/Email", er)
		return
	}

	//check if user exists
	usernameExists, emailExists, err := db.CheckUserExists(username, email)
	if err != nil {
		http.Error(w, "Error checking for existing user", http.StatusInternalServerError)
		return
	}

	if usernameExists || emailExists {
		http.Error(w, "A user already exists with the provided Username or Email.", http.StatusConflict)
		return
	}

	//hash password
	hp, err := hashPassword(password)
	if err != nil {
		http.Error(w, "Error hashing password", http.StatusInternalServerError)
		return
	}

	err = db.InsertUser(username, hp, email)
	if err != nil {
		http.Error(w, "Error registering user", http.StatusInternalServerError)
		return
	}

	fmt.Fprintln(w, "User registered successfully!")

}

// handle logins
func loginHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Invalid request method. Use POST", http.StatusMethodNotAllowed)
		return
	}

	username := r.FormValue("username")
	password := r.FormValue("password")

	storedHashedPassword, err := db.SelectHP(username) // Adjusted function call
	if err != nil {
		http.Error(w, "Invalid username or password", http.StatusUnauthorized)
		return
	}

	//verify pw
	if !checkPasswordHash(password, storedHashedPassword) {
		http.Error(w, "Invalid username or password", http.StatusUnauthorized)
		return
	}

	//generate jwt token
	token, err := generateJWT(username)
	if err != nil {
		http.Error(w, "Error generating token", http.StatusInternalServerError)
		return
	}

	//set token as cookie
	http.SetCookie(w, &http.Cookie{
		Name:     "token",
		Value:    token,
		Expires:  time.Now().Add(24 * time.Hour),
		HttpOnly: true, //set as http-only
	})

	fmt.Fprintf(w, "Login Successful!")

}

// authentication func using JWT
func authenticate(next http.HandlerFunc) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		//extract jwt from cookie
		cookie, err := r.Cookie("token")
		if err != nil {
			http.Error(w, "Unauthorized", http.StatusUnauthorized)
			return
		}

		//parse the jwt
		claims := &jwt.RegisteredClaims{}
		token, err := jwt.ParseWithClaims(cookie.Value, claims, func(token *jwt.Token) (interface{}, error) {
			return jwtKey, nil
		})

		//check if the token is valid
		if err != nil || !token.Valid {
			http.Error(w, "Unauthorized", http.StatusUnauthorized)
			return
		}

		//if token is valid, call the next handler (the protected one)
		next(w, r)
	}
}

// handle logging out a user. clears cookies
func logoutHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Invalid request method. Use POST", http.StatusMethodNotAllowed)
		return
	}

	http.SetCookie(w, &http.Cookie{
		Name:     "token",
		Value:    "",
		Expires:  time.Now().Add(-1 * time.Hour),
		HttpOnly: true,
	})
	fmt.Fprintf(w, "Logged out successfully!")
}

// test protected endpoint handler. Delete later
func protectedHandler(w http.ResponseWriter, r *http.Request) {
	//test protected endpoint to see if only logged in users can access this one

	if r.Method != http.MethodPost {
		http.Error(w, "Invalid request method. Use POST", http.StatusMethodNotAllowed)
		return
	}

	fmt.Fprintf(w, "Access to protected resource granted!")

}

func handleRoot(w http.ResponseWriter, r *http.Request) {
	fmt.Fprintf(w, "Welcome to the Go backend!")
}

func handleHello(w http.ResponseWriter, r *http.Request) {
	fmt.Fprintf(w, "Hello, World!")
}
