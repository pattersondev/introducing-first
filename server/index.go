package main

import (
	"fmt"
	"log"
	"net/http"
	"os"
	"strings"

	"server/db"

	"time"

	"net/mail"

	"regexp"

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
func generateJWT(email string) (string, error) {
	//token expire time (sets validity to one day after generation for now)
	expirationTime := time.Now().Add(24 * time.Hour)

	userId, err := db.SelectUserId(email)
	if err != nil {
		fmt.Println("Error in retrieval of user id")
	}

	username, err := db.SelectUsername(email)
	if err != nil {
		fmt.Println("Error in retrieval of username")
	}

	//define custom claims struct to include UserId
	claims := struct {
		Username string `json:"username"`
		UserId   string `json:"userId"`
		jwt.RegisteredClaims
	}{
		Username: username,
		UserId:   userId,
		RegisteredClaims: jwt.RegisteredClaims{
			ExpiresAt: jwt.NewNumericDate(expirationTime),
		},
	}

	//create the JWT token with custom claims
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

// check to see if password is valid
func isValidPassword(password string) bool {
	// isValidPassword checks if the password meets the criteria:
	// - At least 8 characters
	// - Less than 50 characters
	// - Contains at least one special character
	// - Contains at least one uppercase letter
	// - Contains at least one lowercase letter

	//at least 8 and less than 50 characters?
	if len(password) < 8 || len(password) > 50 {
		return false
	}

	//at least one uppercase letter?
	hasUppercase := regexp.MustCompile(`[A-Z]`).MatchString(password)

	//at least one lowercase letter?
	hasLowercase := regexp.MustCompile(`[a-z]`).MatchString(password)

	//at least one special character?
	hasSpecialChar := regexp.MustCompile(`[^\w\d\s]`).MatchString(password) // non-alphanumeric and non-space characters

	//if all conditions met, return true
	return hasUppercase && hasLowercase && hasSpecialChar
}

// check to see if password is valid
func isValidUsername(username string) bool {
	//checks password is at least 3 characters and less than 50 characters

	if len(username) < 3 || len(username) > 50 {
		return false
	}

	return true
}

// check to see if phone number is valid
func isValidPhoneNumber(number string) bool {
	//reg expression for phone number format 123-456-7890
	re := regexp.MustCompile(`^\d{3}-\d{3}-\d{4}$`)

	//check that phonenumber that it matches the exact format
	return re.MatchString(number)
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
	phone := r.FormValue("phone")

	//username and password must be atleast 8 characters long and email must be valid
	if !isValidUsername(username) || !isValidPassword(password) || !isValidEmail(email) || !isValidPhoneNumber(phone) {
		er := http.StatusNotAcceptable
		http.Error(w, "Invalid Username/Password/Email/Phone", er)
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

	//convert username to lowercase
	username = strings.ToLower(username)

	err = db.InsertUser(username, hp, email, phone)
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

	email := r.FormValue("email")
	password := r.FormValue("password")

	storedHashedPassword, err := db.SelectHP(email) //adjusted function call
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
	token, err := generateJWT(email)
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
