package main

import (
	"encoding/json"
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

// Add CORS middleware
func enableCORS(handler http.HandlerFunc) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		// Allow specific origins
		allowedOrigins := []string{
			"http://localhost:3000",
			"https://antiballsniffer.club",
			"https://www.antiballsniffer.club",
			"https://introducing-first.vercel.app",
		}

		origin := r.Header.Get("Origin")
		for _, allowedOrigin := range allowedOrigins {
			if origin == allowedOrigin {
				w.Header().Set("Access-Control-Allow-Origin", origin)
				break
			}
		}

		// Allow credentials
		w.Header().Set("Access-Control-Allow-Credentials", "true")

		// Allow specific headers
		w.Header().Set("Access-Control-Allow-Headers", "Content-Type, Accept")

		// Allow specific methods
		w.Header().Set("Access-Control-Allow-Methods", "POST, GET, OPTIONS")

		// Handle preflight requests
		if r.Method == "OPTIONS" {
			w.WriteHeader(http.StatusOK)
			return
		}

		handler(w, r)
	}
}

// Add this after your other imports and before main()
type UserResponse struct {
	ID       string `json:"id"`
	Username string `json:"username"`
	Email    string `json:"email"`
}

func main() {

	_ = godotenv.Load()
	fmt.Printf("Environment variables present: JWT_SECRET=%v\n", os.Getenv("JWT_SECRET") != "")
	jwtKey = []byte(getEnvWithFallback("JWT_SECRET", "your-default-secret-key"))
	if len(jwtKey) == 0 {
		log.Fatal("JWT_SECRET not set in environment")
	}

	db.StartUsersDbConnection()

	http.HandleFunc("/", handleRoot)
	http.HandleFunc("/hello", handleHello)

	http.HandleFunc("/login", enableCORS(loginHandler))
	http.HandleFunc("/register", enableCORS(registerHandler))
	http.HandleFunc("/logout", enableCORS(logoutHandler))

	//test endpoint. hidden behind authentication. Delete later
	http.HandleFunc("/protected", authenticate(protectedHandler))

	// Add this with your other http.HandleFunc calls in main()
	http.HandleFunc("/api/auth/status", enableCORS(authenticate(authStatusHandler)))

	port := getEnvWithFallback("PORT", "8080")
	fmt.Printf("Server starting on :%s\n", port)
	log.Fatal(http.ListenAndServe(":"+port, nil))

}

// generates JWT
func generateJWT(email string) (string, error) {
	//token expire time (sets validity to one day after generation for now)
	expirationTime := time.Now().Add(24 * time.Hour)

	//define claims for token (username and expiration date for now)
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
	//checks username is at least 3 characters and less than 50 characters

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

	// Debug logging
	log.Printf("Login attempt for username: %s", email)

	storedHashedPassword, err := db.SelectHP(email)
	if err != nil {
		log.Printf("Login failed for username %s: %v", email, err)
		http.Error(w, "Invalid username or password", http.StatusUnauthorized)
		return
	}

	//verify pw
	if !checkPasswordHash(password, storedHashedPassword) {
		log.Printf("Password verification failed for username %s", email)
		http.Error(w, "Invalid username or password", http.StatusUnauthorized)
		return
	}

	//generate jwt token
	token, err := generateJWT(email)
	if err != nil {
		log.Printf("Token generation failed for username %s: %v", email, err)
		http.Error(w, "Error generating token", http.StatusInternalServerError)
		return
	}

	//set token as cookie
	http.SetCookie(w, &http.Cookie{
		Name:     "token",
		Value:    token,
		Expires:  time.Now().Add(24 * time.Hour),
		HttpOnly: true,
		Secure:   true, // Only send cookie over HTTPS
		SameSite: http.SameSiteStrictMode,
		Path:     "/",
	})

	// Set content type for the response
	w.Header().Set("Content-Type", "application/json")

	// Return success response
	fmt.Fprintf(w, `{"message": "Login Successful!"}`)
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

func getEnvWithFallback(key, fallback string) string {
	value := os.Getenv(key)
	if value == "" {
		return fallback
	}
	return value
}

// Add this new handler function
func authStatusHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, "Invalid request method. Use GET", http.StatusMethodNotAllowed)
		return
	}

	// Get the token from cookie
	cookie, err := r.Cookie("token")
	if err != nil {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}

	// Parse and validate the token
	token, err := jwt.ParseWithClaims(cookie.Value, &struct {
		Username string `json:"username"`
		UserId   string `json:"userId"`
		jwt.RegisteredClaims
	}{}, func(token *jwt.Token) (interface{}, error) {
		return jwtKey, nil
	})

	if err != nil || !token.Valid {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}

	// Extract claims
	claims, ok := token.Claims.(*struct {
		Username string `json:"username"`
		UserId   string `json:"userId"`
		jwt.RegisteredClaims
	})
	if !ok {
		http.Error(w, "Invalid token claims", http.StatusUnauthorized)
		return
	}

	// Get user email from database using userId
	email, err := db.SelectEmail(claims.UserId)
	if err != nil {
		http.Error(w, "Error retrieving user data", http.StatusInternalServerError)
		return
	}

	// Create response
	user := UserResponse{
		ID:       claims.UserId,
		Username: claims.Username,
		Email:    email,
	}

	// Set content type
	w.Header().Set("Content-Type", "application/json")

	// Encode and send response
	json.NewEncoder(w).Encode(user)
}
