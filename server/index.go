package main

import (
	"encoding/json"
	"fmt"
	"log"
	"net/http"

	"server/db"
	"server/models"

	"github.com/joho/godotenv"
	_ "github.com/lib/pq"
)

func main() {

	err := godotenv.Load()
	if err != nil {
		log.Fatalf("Error loading .env file: %v", err)
	}

	//manually creating a test fighter
	testfighter := models.Fighter{
		Name:          "Rhabib Nurmagomedov",
		Nickname:      "Pebble",
		DivisionTitle: "Heaviest Weight",
		Status:        "Active",
		Hometown:      "Roanoke, Virginia",
		OctagonDebut:  "Feb 2024",
		ImageLink:     "exampleimagelink",
		Girth:         ".01",
		Stance:        "Mutant",
		FighterID:     123457,
		FightingStyle: "Sniffer",
		Gym:           "MMA Lab",
		Age:           42,
		Height:        5,
		Weight:        290,
		Reach:         2.0,
		LegReach:      4.0,
	}

	db.StartDbConnection()

	db.InsertFighter(testfighter)

	http.HandleFunc("/", handleRoot)
	http.HandleFunc("/hello", handleHello)
	http.HandleFunc("/fighter", addFighter)

	fmt.Println("Server starting on :8080")
	log.Fatal(http.ListenAndServe(":8080", nil))
}

func handleRoot(w http.ResponseWriter, r *http.Request) {
	fmt.Fprintf(w, "Welcome to the Go backend!")
}

func handleHello(w http.ResponseWriter, r *http.Request) {
	fmt.Fprintf(w, "Hello, World!")
}

func addFighter(w http.ResponseWriter, r *http.Request) {
	fmt.Fprintf(w, "Gimme dat fighter data")

	//only allow processing if it's a Post Request
	if r.Method != http.MethodPost {
		http.Error(w, "Invalid request method", http.StatusMethodNotAllowed)
		return
	}

	var newFighter models.Fighter

	//handle bad requests
	err := json.NewDecoder(r.Body).Decode(&newFighter)
	if err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

}
