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

type JSONEvent struct {
	Name     string          `json:"Name"`
	Date     string          `json:"Date"`
	Location string          `json:"Location"`
	Matchups []JSONFightData `json:"matchups"`
}

type JSONFightData struct {
	Fighter1 string `json:"Fighter1"`
	Fighter2 string `json:"Fighter2"`
	Result   string `json:"Result"`
	Winner   string `json:"Winner"`
}

type JSONFighter struct {
	Name         string                  `json:"name"`
	Stats        []JSONFightStats        `json:"stats"`
	Bio          JSONFighterBio          `json:"bio"`
	FightHistory []JSONFightHistoryEntry `json:"fighthistory"`
}

type JSONFighterBio struct {
	Country   string `json:"country"`
	WTClass   string `json:"wtclass"`
	HTWT      string `json:"htwt"`
	Birthdate string `json:"dob"`
	Team      string `json:"team"`
	Nickname  string `json:"nickname"`
	Stance    string `json:"stance"`
	Reach     string `json:"reach"`
}

type JSONFightStats struct {
	Date     string `json:"date"`
	Opponent string `json:"opponent"`
	Event    string `json:"event"`
	Result   string `json:"result"`
	SDBL_A   string `json:"sdBla"`
	SDHL_A   string `json:"sdHla"`
	SDLL_A   string `json:"sdLla"`
	TSL      string `json:"tsl"`
	TSA      string `json:"tsa"`
	SSL      string `json:"ssl"`
	SSA      string `json:"ssa"`
	TSL_TSA  string `json:"tsltsa"`
	KD       string `json:"kd"`
	BodyPerc string `json:"bodyperc"`
	HeadPerc string `json:"headperc"`
	LegPerc  string `json:"legperc"`
}

type JSONFightHistoryEntry struct {
	Date     string `json:"date"`
	Opponent string `json:"opponent"`
	Result   string `json:"result"`
	Decision string `json:"decision"`
	Round    string `json:"round"`
	Time     string `json:"time"`
	Event    string `json:"event"`
}

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
	http.HandleFunc("/fighter/create", addFighter)
	http.HandleFunc("/event/create", addEvent)

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

	var newFighter JSONFighter

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

func addEvent(w http.ResponseWriter, r *http.Request) {
	fmt.Fprintf(w, "Show me dat event data: ")

	//only allow processing if it's a Post Request
	if r.Method != http.MethodPost {
		http.Error(w, "Invalid request method", http.StatusMethodNotAllowed)
		return
	}

	var newEvent JSONEvent

	//decoding json and creating temp event object / handling bad requests
	err := json.NewDecoder(r.Body).Decode(&newEvent)
	if err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	//print event for now, will eventually add the event to the db
	fmt.Fprintf(w, "Recieved new event: ", newEvent)

}
