package main

import (
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"os"
	"strconv"

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
	http.HandleFunc("/getPicksForEvent", getPicksForEventHandler)
	http.HandleFunc("/getPicksForUserAndEvent", getPicksForUserAndEventHandler)
	http.HandleFunc("/getPicksForMatchup", getPicksForMatchupHandler)

	port := getEnvWithFallback("PORT", "8080")
	fmt.Printf("Server starting on :%s\n", port)
	log.Fatal(http.ListenAndServe(":"+port, nil))

}

func handleRoot(w http.ResponseWriter, r *http.Request) {
	fmt.Fprintf(w, "Welcome to the Go backend!")
}

func getPicksForEventHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, "Invalid request method. Use GET", http.StatusMethodNotAllowed)
		return
	}

	eventId := r.URL.Query().Get("eventId")
	if eventId == "" {
		http.Error(w, "Missing query parameter: eventId", http.StatusBadRequest)
		return
	}

	picks, err := db.GetPicksForEvent(eventId)
	if err != nil {
		http.Error(w, fmt.Sprintf("Error retrieving picks for event: %v", err), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	if err := json.NewEncoder(w).Encode(picks); err != nil {
		http.Error(w, "Error encoding picks to JSON", http.StatusInternalServerError)
	}
}

func getPicksForUserAndEventHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, "Invalid request method. Use GET", http.StatusMethodNotAllowed)
		return
	}

	userIdStr := r.URL.Query().Get("userId") //assign query parameter to userIdStr
	eventId := r.URL.Query().Get("eventId")

	if userIdStr == "" || eventId == "" {
		http.Error(w, "Missing query parameters: userId and eventId are required", http.StatusBadRequest)
		return
	}

	//convert userIdStr to int
	userId, err := strconv.Atoi(userIdStr)
	if err != nil {
		http.Error(w, "Invalid userId: must be an integer", http.StatusBadRequest)
		return
	}

	picks, err := db.GetPicksForUserAndEvent(userId, eventId)
	if err != nil {
		http.Error(w, fmt.Sprintf("Error retrieving picks for user and event: %v", err), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	if err := json.NewEncoder(w).Encode(picks); err != nil {
		http.Error(w, "Error encoding picks to JSON", http.StatusInternalServerError)
	}
}

func getPicksForMatchupHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, "Invalid request method. Use GET", http.StatusMethodNotAllowed)
		return
	}

	matchupId := r.URL.Query().Get("matchupId")
	if matchupId == "" {
		http.Error(w, "Missing query parameter: matchupId", http.StatusBadRequest)
		return
	}

	picks, err := db.GetPicksForMatchup(matchupId)
	if err != nil {
		http.Error(w, fmt.Sprintf("Error retrieving picks for matchup: %v", err), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	if err := json.NewEncoder(w).Encode(picks); err != nil {
		http.Error(w, "Error encoding picks to JSON", http.StatusInternalServerError)
	}
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
