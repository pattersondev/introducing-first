package main

import (
	"fmt"
	"log"
	"net/http"
	"os"

	"github.com/joho/godotenv"

	"picks-service/db"

	_ "github.com/lib/pq"
)

func main() {
	_ = godotenv.Load()

	db.StartUsersDbConnection()

	//fmt.Printf(test("hi"))

	http.HandleFunc("/", handleRoot)
	http.HandleFunc("/insertPick", insertPickHandler)

	port := getEnvWithFallback("PORT", "8080")
	fmt.Printf("Server starting on :%s\n", port)
	log.Fatal(http.ListenAndServe(":"+port, nil))

}

func handleRoot(w http.ResponseWriter, r *http.Request) {
	fmt.Fprintf(w, "Welcome to the Go backend!")
}

func insertPickHandler(w http.ResponseWriter, r *http.Request) {

	if r.Method != http.MethodPost {
		http.Error(w, "Invalid request method. Use POST", http.StatusMethodNotAllowed)
		return
	}

	//receive username and password and do basic length check
	userId := r.FormValue("userId")
	matchupId := r.FormValue("matchupId")
	eventId := r.FormValue("eventId")
	selectionId := r.FormValue("selectionId")

	err := db.UpsertPick(userId, matchupId, eventId, selectionId)
	if err != nil {
		http.Error(w, "Error inserting / updating pick", http.StatusInternalServerError)
		return
	}

	fmt.Fprintf(w, "Sucessfully inserted pick!")

}

func getEnvWithFallback(key, fallback string) string {
	value := os.Getenv(key)
	if value == "" {
		return fallback
	}
	return value
}

func test(password string) string {
	return string("Hi")
}
