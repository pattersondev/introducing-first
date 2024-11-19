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

	"mime/multipart"
	"path/filepath"

	"crypto/hmac"
	"crypto/sha256"
	"encoding/hex"
	"io"

	"github.com/golang-jwt/jwt/v4"
	"github.com/google/uuid"
	"github.com/joho/godotenv"
	_ "github.com/lib/pq"
	"golang.org/x/crypto/bcrypt"
)

var jwtKey []byte
var bucketName string

// Add CORS middleware
func enableCORS(handler http.HandlerFunc) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		origin := r.Header.Get("Origin")

		// Allow specific origins
		allowedOrigins := map[string]bool{
			"http://localhost:3000":                true,
			"https://antiballsniffer.club":         true,
			"https://www.antiballsniffer.club":     true,
			"https://introducing-first.vercel.app": true,
		}

		if allowedOrigins[origin] {
			w.Header().Set("Access-Control-Allow-Origin", origin)
			w.Header().Set("Access-Control-Allow-Credentials", "true")
			w.Header().Set("Access-Control-Allow-Headers", "Content-Type, Accept, Authorization, Cookie, X-Requested-With")
			w.Header().Set("Access-Control-Allow-Methods", "POST, GET, OPTIONS, PUT, DELETE")
			w.Header().Set("Access-Control-Expose-Headers", "Set-Cookie")
			w.Header().Set("Vary", "Origin")
		}

		if r.Method == "OPTIONS" {
			w.WriteHeader(http.StatusOK)
			return
		}

		handler(w, r)
	}
}

// Add this after your other imports and before main()
type UserResponse struct {
	ID             string `json:"id"`
	Username       string `json:"username"`
	Email          string `json:"email"`
	ProfilePicture string `json:"profilePicture,omitempty"`
}

// Add these constants
const (
	maxUploadSize = 5 << 20 // 5MB
)

func main() {

	_ = godotenv.Load()
	fmt.Printf("Environment variables present: JWT_SECRET=%v\n", os.Getenv("JWT_SECRET") != "")
	jwtKey = []byte(getEnvWithFallback("JWT_SECRET", "your-default-secret-key"))
	if len(jwtKey) == 0 {
		log.Fatal("JWT_SECRET not set in environment")
	}

	db.StartUsersDbConnection()

	// Initialize bucketName from environment
	bucketName = os.Getenv("S3_BUCKET_NAME")
	if bucketName == "" {
		log.Fatal("S3_BUCKET_NAME not set in environment")
	}

	http.HandleFunc("/", handleRoot)
	http.HandleFunc("/hello", handleHello)

	http.HandleFunc("/login", enableCORS(loginHandler))
	http.HandleFunc("/register", enableCORS(registerHandler))
	http.HandleFunc("/logout", enableCORS(logoutHandler))

	//test endpoint. hidden behind authentication. Delete later
	http.HandleFunc("/protected", authenticate(protectedHandler))

	// Add this with your other http.HandleFunc calls in main()
	http.HandleFunc("/api/auth/status", enableCORS(authenticate(authStatusHandler)))

	http.HandleFunc("/api/profile/upload", enableCORS(authenticate(uploadProfilePictureHandler)))

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
		Secure:   true,
		SameSite: http.SameSiteNoneMode,
		Path:     "/",
	})

	// Set content type for the response
	w.Header().Set("Content-Type", "application/json")

	// Return success response with token
	json.NewEncoder(w).Encode(map[string]string{
		"message": "Login Successful!",
		"token":   token,
	})
}

// authentication func using JWT
func authenticate(next http.HandlerFunc) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		var tokenString string

		// First try to get token from cookie
		cookie, err := r.Cookie("token")
		if err == nil {
			tokenString = cookie.Value
		} else {
			// If no cookie, check Authorization header
			authHeader := r.Header.Get("Authorization")
			if strings.HasPrefix(authHeader, "Bearer ") {
				tokenString = strings.TrimPrefix(authHeader, "Bearer ")
			}
		}

		if tokenString == "" {
			log.Printf("No token found in cookie or Authorization header")
			http.Error(w, "Unauthorized", http.StatusUnauthorized)
			return
		}

		// Parse and validate the token
		claims := &struct {
			Username string `json:"username"`
			UserId   string `json:"userId"`
			jwt.RegisteredClaims
		}{}

		token, err := jwt.ParseWithClaims(tokenString, claims, func(token *jwt.Token) (interface{}, error) {
			return jwtKey, nil
		})

		if err != nil {
			log.Printf("Token parsing failed: %v", err)
			http.Error(w, "Unauthorized", http.StatusUnauthorized)
			return
		}

		if !token.Valid {
			log.Printf("Token is invalid")
			http.Error(w, "Unauthorized", http.StatusUnauthorized)
			return
		}

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
		Secure:   true,
		SameSite: http.SameSiteNoneMode,
		Path:     "/",
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

	// Get user email and profile picture from database using userId
	email, err := db.SelectEmail(claims.UserId)
	if err != nil {
		http.Error(w, "Error retrieving user data", http.StatusInternalServerError)
		return
	}

	profilePicture, err := db.GetProfilePicture(claims.UserId)
	if err != nil {
		http.Error(w, "Error retrieving user data", http.StatusInternalServerError)
		return
	}

	// Create response
	user := UserResponse{
		ID:             claims.UserId,
		Username:       claims.Username,
		Email:          email,
		ProfilePicture: profilePicture,
	}

	// Set content type and encode response
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(user)
}

// Add these helper functions for S3 signing
func hmacSHA256(key []byte, data string) []byte {
	h := hmac.New(sha256.New, key)
	h.Write([]byte(data))
	return h.Sum(nil)
}

func getSignatureKey(key, dateStamp, regionName, serviceName string) []byte {
	kDate := hmacSHA256([]byte("AWS4"+key), dateStamp)
	kRegion := hmacSHA256(kDate, regionName)
	kService := hmacSHA256(kRegion, serviceName)
	kSigning := hmacSHA256(kService, "aws4_request")
	return kSigning
}

// Update uploadToS3 to use direct HTTP requests
func uploadToS3(file multipart.File, filename string, size int64) (string, error) {
	region := os.Getenv("AWS_REGION")
	accessKey := os.Getenv("AWS_ACCESS_KEY_ID")
	secretKey := os.Getenv("AWS_SECRET_ACCESS_KEY")

	if region == "" || accessKey == "" || secretKey == "" {
		return "", fmt.Errorf("AWS credentials not set")
	}

	endpoint := fmt.Sprintf("https://%s.s3.%s.amazonaws.com/%s", bucketName, region, filename)

	// Create PUT request
	req, err := http.NewRequest("PUT", endpoint, file)
	if err != nil {
		return "", err
	}

	// Set headers
	req.ContentLength = size
	req.Header.Set("Content-Type", getContentType(filename))

	// Sign request (AWS Signature V4)
	t := time.Now().UTC()
	amzDate := t.Format("20060102T150405Z")
	datestamp := t.Format("20060102")

	// Create canonical request
	canonicalURI := "/" + filename
	canonicalQueryString := ""
	canonicalHeaders := fmt.Sprintf("content-length:%d\ncontent-type:%s\nhost:%s.s3.%s.amazonaws.com\nx-amz-date:%s\n",
		size, getContentType(filename), bucketName, region, amzDate)
	signedHeaders := "content-length;content-type;host;x-amz-date"

	payloadHash := "UNSIGNED-PAYLOAD"
	canonicalRequest := fmt.Sprintf("%s\n%s\n%s\n%s\n%s\n%s",
		"PUT", canonicalURI, canonicalQueryString, canonicalHeaders, signedHeaders, payloadHash)

	// Create string to sign
	algorithm := "AWS4-HMAC-SHA256"
	credentialScope := fmt.Sprintf("%s/%s/s3/aws4_request", datestamp, region)
	stringToSign := fmt.Sprintf("%s\n%s\n%s\n%s",
		algorithm, amzDate, credentialScope, hex.EncodeToString(sha256.New().Sum([]byte(canonicalRequest))))

	// Calculate signature
	signingKey := getSignatureKey(secretKey, datestamp, region, "s3")
	signature := hex.EncodeToString(hmacSHA256(signingKey, stringToSign))

	// Add authorization header
	authorizationHeader := fmt.Sprintf("%s Credential=%s/%s, SignedHeaders=%s, Signature=%s",
		algorithm, accessKey, credentialScope, signedHeaders, signature)

	req.Header.Set("Authorization", authorizationHeader)
	req.Header.Set("x-amz-date", amzDate)

	// Send request
	client := &http.Client{}
	resp, err := client.Do(req)
	if err != nil {
		return "", err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(resp.Body)
		return "", fmt.Errorf("upload failed: %s", string(body))
	}

	return endpoint, nil
}

// Update deleteFromS3 to include complete signing logic
func deleteFromS3(objectKey string) error {
	region := os.Getenv("AWS_REGION")
	accessKey := os.Getenv("AWS_ACCESS_KEY_ID")
	secretKey := os.Getenv("AWS_SECRET_ACCESS_KEY")

	if region == "" || accessKey == "" || secretKey == "" {
		return fmt.Errorf("AWS credentials not set")
	}

	endpoint := fmt.Sprintf("https://%s.s3.%s.amazonaws.com/%s", bucketName, region, objectKey)

	req, err := http.NewRequest("DELETE", endpoint, nil)
	if err != nil {
		return err
	}

	// Sign request with AWS Signature V4
	t := time.Now().UTC()
	amzDate := t.Format("20060102T150405Z")
	datestamp := t.Format("20060102")

	// Create canonical request
	canonicalURI := "/" + objectKey
	canonicalQueryString := ""
	canonicalHeaders := fmt.Sprintf("host:%s.s3.%s.amazonaws.com\nx-amz-date:%s\n",
		bucketName, region, amzDate)
	signedHeaders := "host;x-amz-date"

	payloadHash := "UNSIGNED-PAYLOAD"
	canonicalRequest := fmt.Sprintf("%s\n%s\n%s\n%s\n%s\n%s",
		"DELETE", canonicalURI, canonicalQueryString, canonicalHeaders, signedHeaders, payloadHash)

	// Create string to sign
	algorithm := "AWS4-HMAC-SHA256"
	credentialScope := fmt.Sprintf("%s/%s/s3/aws4_request", datestamp, region)
	stringToSign := fmt.Sprintf("%s\n%s\n%s\n%s",
		algorithm, amzDate, credentialScope, hex.EncodeToString(sha256.New().Sum([]byte(canonicalRequest))))

	// Calculate signature
	signingKey := getSignatureKey(secretKey, datestamp, region, "s3")
	signature := hex.EncodeToString(hmacSHA256(signingKey, stringToSign))

	// Add authorization header
	authorizationHeader := fmt.Sprintf("%s Credential=%s/%s, SignedHeaders=%s, Signature=%s",
		algorithm, accessKey, credentialScope, signedHeaders, signature)

	req.Header.Set("Authorization", authorizationHeader)
	req.Header.Set("x-amz-date", amzDate)

	client := &http.Client{}
	resp, err := client.Do(req)
	if err != nil {
		return err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusNoContent && resp.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(resp.Body)
		return fmt.Errorf("delete failed: %s", string(body))
	}

	return nil
}

// Extract object key from S3 URL
func getObjectKeyFromURL(url string) string {
	// URL format: https://bucket-name.s3.amazonaws.com/path/to/file
	parts := strings.Split(url, bucketName+".s3.amazonaws.com/")
	if len(parts) != 2 {
		return ""
	}
	return parts[1]
}

// Update the uploadProfilePictureHandler
func uploadProfilePictureHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	// Parse the multipart form
	err := r.ParseMultipartForm(maxUploadSize)
	if err != nil {
		sendJSONError(w, "File too large", http.StatusBadRequest)
		return
	}

	file, header, err := r.FormFile("image")
	if err != nil {
		sendJSONError(w, "Invalid file", http.StatusBadRequest)
		return
	}
	defer file.Close()

	// Validate file type
	if !isValidImageType(header.Filename) {
		sendJSONError(w, "Invalid file type. Only jpeg, jpg, and png are allowed", http.StatusBadRequest)
		return
	}

	// Get user ID from token
	claims := getUserClaimsFromToken(r)
	if claims == nil {
		sendJSONError(w, "Unauthorized", http.StatusUnauthorized)
		return
	}

	// Get current profile picture URL
	currentPictureURL, err := db.GetProfilePicture(claims.UserId)
	if err != nil {
		log.Printf("Error getting current profile picture: %v", err)
		sendJSONError(w, "Failed to get current profile picture", http.StatusInternalServerError)
		return
	}

	// Delete old profile picture if it exists
	if currentPictureURL != "" {
		objectKey := getObjectKeyFromURL(currentPictureURL)
		if objectKey != "" {
			err = deleteFromS3(objectKey)
			if err != nil {
				log.Printf("Warning: Failed to delete old profile picture: %v", err)
				// Continue with upload even if delete fails
			}
		}
	}

	// Generate unique filename
	filename := fmt.Sprintf("profile-pictures/%s%s", uuid.New().String(), filepath.Ext(header.Filename))

	// Upload new picture to S3
	url, err := uploadToS3(file, filename, header.Size)
	if err != nil {
		log.Printf("Error uploading to S3: %v", err)
		sendJSONError(w, "Failed to upload file", http.StatusInternalServerError)
		return
	}

	// Update user's profile picture URL in database
	err = db.UpdateProfilePicture(claims.UserId, url)
	if err != nil {
		// If database update fails, try to delete the uploaded file
		deleteErr := deleteFromS3(filename)
		if deleteErr != nil {
			log.Printf("Warning: Failed to delete uploaded file after database error: %v", deleteErr)
		}
		log.Printf("Error updating profile picture in database: %v", err)
		sendJSONError(w, "Failed to update profile picture", http.StatusInternalServerError)
		return
	}

	// Return success response
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]string{
		"url":     url,
		"message": "Profile picture updated successfully",
	})
}

func isValidImageType(filename string) bool {
	ext := strings.ToLower(filepath.Ext(filename))
	return ext == ".jpg" || ext == ".jpeg" || ext == ".png"
}

// Add this function to get claims from token
func getUserClaimsFromToken(r *http.Request) *struct {
	Username string `json:"username"`
	UserId   string `json:"userId"`
	jwt.RegisteredClaims
} {
	cookie, err := r.Cookie("token")
	if err != nil {
		return nil
	}

	claims := &struct {
		Username string `json:"username"`
		UserId   string `json:"userId"`
		jwt.RegisteredClaims
	}{}

	token, err := jwt.ParseWithClaims(cookie.Value, claims, func(token *jwt.Token) (interface{}, error) {
		return jwtKey, nil
	})

	if err != nil || !token.Valid {
		return nil
	}

	return claims
}

// Helper function to determine content type
func getContentType(filename string) string {
	ext := strings.ToLower(filepath.Ext(filename))
	switch ext {
	case ".jpg", ".jpeg":
		return "image/jpeg"
	case ".png":
		return "image/png"
	default:
		return "application/octet-stream"
	}
}

// Add this helper function for consistent error responses
func sendJSONError(w http.ResponseWriter, message string, status int) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	json.NewEncoder(w).Encode(map[string]string{
		"error": message,
	})
}
