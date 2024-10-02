package main

import (
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

	fmt.Println("Server starting on :8080")
	log.Fatal(http.ListenAndServe(":8080", nil))
}

func handleRoot(w http.ResponseWriter, r *http.Request) {
	fmt.Fprintf(w, "Welcome to the Go backend!")
}

func handleHello(w http.ResponseWriter, r *http.Request) {
	fmt.Fprintf(w, "Hello, World!")
}
