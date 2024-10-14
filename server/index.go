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

type JSONStrikingStats struct {
	Date        string `json:"date"`
	Opponent    string `json:"opponent"`
	Event       string `json:"event"`
	Result      string `json:"result"`
	SDblA       string `json:"sdbl_a"`  // Significant Distance Blows Landed/Attempted
	SDhlA       string `json:"sdhl_a"`  // Significant Head Blows Landed/Attempted
	SDllA       string `json:"sdll_a"`  // Significant Leg Blows Landed/Attempted
	TSL         string `json:"tsl"`     // Total Strikes Landed
	TSA         string `json:"tsa"`     // Total Strikes Attempted
	SSL         string `json:"ssl"`     // Significant Strikes Landed
	SSA         string `json:"ssa"`     // Significant Strikes Attempted
	TSL_TSA     string `json:"tsl_tsa"` // Total Strikes Landed/Attempted
	KD          string `json:"kd"`      // Knockdowns
	PercentBody string `json:"percent_body"`
	PercentHead string `json:"percent_head"`
	PercentLeg  string `json:"percent_leg"`
}

type JSONClinchStats struct {
	Date     string `json:"date"`
	Opponent string `json:"opponent"`
	Event    string `json:"event"`
	Result   string `json:"result"`
	SCBL     string `json:"scbl"`   // Significant Distance Blows Landed/Attempted
	SCBA     string `json:"scba"`   // Significant Head Blows Landed/Attempted
	SCHL     string `json:"schl"`   // Significant Leg Blows Landed/Attempted
	SCHA     string `json:"scha"`   // Significant Strikes Landed
	SCLL     string `json:"scll"`   // Significant Strikes Attempted
	SCLA     string `json:"scla"`   // Significant Strikes Attempted
	RV       string `json:"rv"`     // Reversal Volumes
	SR       string `json:"sr"`     // Reversal Volumes
	TDL      string `json:"tdl"`    // takedowns landed
	TDA      string `json:"tda"`    // takedowns attempted
	TDS      string `json:"tds"`    // Takedown slams
	TK_ACC   string `json:"tk_acc"` // Takedown Accuracy
}

type JSONGroundStats struct {
	Date     string `json:"date"`
	Opponent string `json:"opponent"`
	Event    string `json:"event"`
	Result   string `json:"result"`
	SGBL     string `json:"sgbl"` // Significant Ground Body Strikes Landed/
	SGBA     string `json:"sgba"` // Significant Ground Body Strikes Attempted
	SGHL     string `json:"sghl"` // Significant Ground Head Strikes Landed
	SGHA     string `json:"sgha"` // Significant Ground Head Strikes Attempted
	SGLL     string `json:"sgll"` // Significant Ground Leg Strikes Landed
	SGLA     string `json:"sgla"` // Significant Ground Leg Strikes Attempted
	AD       string `json:"ad"`   // Advances
	ADTB     string `json:"adtb"` // Advance to back
	ADHG     string `json:"adhg"` // Advance to half guard
	ADTM     string `json:"adtm"` // Advance to mount
	ADTS     string `json:"adts"` // Advance to side control
	SM       string `json:"sm"`   // Submissions
}

type JSONFighter struct {
	FirstName       string              `json:"first_name"`
	LastName        string              `json:"last_name"`
	HeightAndWeight string              `json:"height_and_weight"`
	Birthdate       string              `json:"birthdate"`
	Team            string              `json:"team"`
	Nickname        string              `json:"nickname"`
	Stance          string              `json:"stance"`
	WinLossRecord   string              `json:"win_loss_record"`
	TKORecord       string              `json:"tko_record"`
	SubRecord       string              `json:"sub_record"`
	StrikingStats   []JSONStrikingStats `json:"striking_stats"` // Array of striking stats
	ClinchStats     []JSONClinchStats   `json:"clinch_stats"`   // Array of clinch stats
	GroundStats     []JSONGroundStats   `json:"ground_stats"`   // Array of ground stats
}

type EventList []JSONEvent

type FighterList []JSONFighter

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
