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

type EventList []models.Event

type FighterList []models.Fighter

func main() {

	err := godotenv.Load()
	if err != nil {
		log.Fatalf("Error loading .env file: %v", err)
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

	//db.InsertFighter(testfighter)

	http.HandleFunc("/", handleRoot)
	http.HandleFunc("/hello", handleHello)
	http.HandleFunc("/fighter/create", addFighter)
	http.HandleFunc("/fighters/create", addFighters)
	http.HandleFunc("/event/create", addEvent)
	http.HandleFunc("/events/create", addEvents)

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
