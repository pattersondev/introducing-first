package main

import (
	"encoding/base64"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"os"

	"server/db"
	"server/models"

	"crypto/rand"
	"time"

	"net/mail"

	"github.com/golang-jwt/jwt/v4"
	"github.com/joho/godotenv"
	_ "github.com/lib/pq"
	"golang.org/x/crypto/bcrypt"
)

// users array map to act as DB while setting functions up. Remove when standalone users DB is created
var users = map[string]User{}

type User struct {
	HashedPassword      string
	TokenExpirationDate string
	// SessionToken   string
	// CSRFToken      string
}

type EventList []models.Event

type FighterList []models.Fighter

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
	//manually creating a test fighter
	// testfighter := models.Fighter{
	// 	Name:          "Rhabib Nurmagomedov",
	// 	Nickname:      "Pebble",
	// 	DivisionTitle: "Heaviest Weight",
	// 	Status:        "Active",
	// 	Hometown:      "Roanoke, Virginia",
	// 	OctagonDebut:  "Feb 2024",
	// 	ImageLink:     "exampleimagelink",
	// 	Girth:         ".01",
	// 	Stance:        "Mutant",
	// 	FighterID:     123457,
	// 	FightingStyle: "Sniffer",
	// 	Gym:           "MMA Lab",
	// 	Age:           42,
	// 	Height:        5,
	// 	Weight:        290,
	// 	Reach:         2.0,
	// 	LegReach:      4.0,
	// }

	db.StartDbConnection()
	db.StartUsersDbConnection()

	//db.InsertFighter(testfighter)

	http.HandleFunc("/", handleRoot)
	http.HandleFunc("/hello", handleHello)
	http.HandleFunc("/fighter/create", addFighter)
	http.HandleFunc("/fighters/create", addFighters)
	http.HandleFunc("/event/create", addEvent)
	http.HandleFunc("/events/create", addEvents)

	http.HandleFunc("/login", loginHandler)
	http.HandleFunc("/register", registerHandler)
	http.HandleFunc("/logout", logoutHandler)
	http.HandleFunc("/protected", authenticate(protectedHandler))

	fmt.Println("Server starting on :8080")
	log.Fatal(http.ListenAndServe(":8080", nil))

}

func generateJWT(username string) (string, error) {
	//token expire time
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

func generateToken(length int) string {
	bytes := make([]byte, length)
	if _, err := rand.Read(bytes); err != nil {
		log.Fatalf("Failed to generate token: %v", err)
	}
	return base64.URLEncoding.EncodeToString(bytes)
}

func hashPassword(password string) (string, error) {
	//Hash the password with cost factor of 10
	bytes, err := bcrypt.GenerateFromPassword([]byte(password), 10)
	return string(bytes), err
}

func checkPasswordHash(password, hash string) bool {
	err := bcrypt.CompareHashAndPassword([]byte(hash), []byte(password))
	return err == nil
}

func isValidEmail(email string) bool {
	_, err := mail.ParseAddress(email)
	return err == nil
}

func registerHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Invalid request method. Use POST", http.StatusMethodNotAllowed)
		return
	}

	//receive username and password and do basic length check
	username := r.FormValue("username")
	password := r.FormValue("password")
	email := r.FormValue("email")

	if len(username) < 8 || len(password) < 8 || !isValidEmail(email) {
		er := http.StatusNotAcceptable
		http.Error(w, "Invalid Username/Password/Email", er)
		return
	}

	// user already exists old logic
	// if _, ok := users[username]; ok {
	// 	er := http.StatusConflict
	// 	http.Error(w, "User already exists", er)
	// 	return
	// }

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

	//registration logic WIP
}

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

	//generate session and csrf token
	// sessionToken := generateToken(32)
	// csrfToken := generateToken(32)

	// //set session token in cookie
	// //expires within 24 hours of generation
	// http.SetCookie(w, &http.Cookie{
	// 	Name:     "session_token",
	// 	Value:    sessionToken,
	// 	Expires:  time.Now().Add(24 * time.Hour),
	// 	HttpOnly: true,
	// })

	// //set csrf token in cookie
	// //expires within 24 hours of generation
	// http.SetCookie(w, &http.Cookie{
	// 	Name:     "csrf_token",
	// 	Value:    csrfToken,
	// 	Expires:  time.Now().Add(24 * time.Hour),
	// 	HttpOnly: false, //client needs to be able to access
	// })

	//store tokens in the "database"
	// user.SessionToken = sessionToken
	// user.CSRFToken = csrfToken
	//users[username] = user

	fmt.Fprintf(w, "Login Successful!")

}

func authenticate(next http.HandlerFunc) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		//get jwt cookies
		cookie, err := r.Cookie("token")
		if err != nil {
			http.Error(w, "Unauthorized", http.StatusUnauthorized)
			return
		}

		//parsing jwt
		claims := &jwt.RegisteredClaims{}
		token, err := jwt.ParseWithClaims(cookie.Value, claims, func(token *jwt.Token) (interface{}, error) {
			return jwtKey, nil
		})

		if err != nil || !token.Valid {
			http.Error(w, "Unauthorized", http.StatusUnauthorized)
			return
		}

		//next handler
		next(w, r)
	}
}

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

func addFighter(w http.ResponseWriter, r *http.Request) {
	fmt.Fprintf(w, "Gimme dat fighter data: ")
	//only allow processing if it's a Post Request
	if r.Method != http.MethodPost {
		http.Error(w, "Invalid request method", http.StatusMethodNotAllowed)
		return
	}

	var newFighter models.Fighter

	//decoding json and creating temp fighter object / handling bad requests
	err := json.NewDecoder(r.Body).Decode(&newFighter)
	if err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	//print fighter for now, will eventually add the fighter to the db
	fmt.Fprintf(w, "Recieved new fighter: ", newFighter)

	//need to modify fighter class and validate schema of JSON before actually adding fighter. DB schema may change too
	//db.InsertFighter(newFighter)
}

func addFighters(w http.ResponseWriter, r *http.Request) {
	fmt.Fprintf(w, "Printing Fighters: ")
	//only allow processing if it's a Post Request
	if r.Method != http.MethodPost {
		http.Error(w, "Invalid request method", http.StatusMethodNotAllowed)
		return
	}

	var fightersArray FighterList

	err := json.NewDecoder(r.Body).Decode(&fightersArray)
	if err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	//printing the first item in in the recieved fighters array
	fmt.Fprintf(w, "Recieved new event: ", fightersArray[0])
}

func addEvent(w http.ResponseWriter, r *http.Request) {
	fmt.Fprintf(w, "Show me dat event data: ")

	//only allow processing if it's a Post Request
	if r.Method != http.MethodPost {
		http.Error(w, "Invalid request method", http.StatusMethodNotAllowed)
		return
	}

	var newEvent models.Event

	//decoding json and creating temp event object / handling bad requests
	err := json.NewDecoder(r.Body).Decode(&newEvent)
	if err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	//print event for now, will eventually add the event to the db
	fmt.Fprintf(w, "Recieved new event: ", newEvent)

}

func addEvents(w http.ResponseWriter, r *http.Request) {

	var eventsArray EventList

	fmt.Fprintf(w, "Show me dat event data: ")

	//only allow processing if it's a Post Request
	if r.Method != http.MethodPost {
		http.Error(w, "Invalid request method", http.StatusMethodNotAllowed)
		return
	}

	//decoding json response body array and storing in temp eventsArray object / handling bad requests

	err := json.NewDecoder(r.Body).Decode(&eventsArray)
	if err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	//print event for now, will eventually add the event to the db
	fmt.Fprintf(w, "Recieved new event: ", eventsArray[0])

}
