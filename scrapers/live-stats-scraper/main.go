package main

import (
	"encoding/json"
	"fmt"
	"log"
	"math/rand"
	"net/http"
	"net/url"
	"os"
	"strings"
	"time"

	"github.com/joho/godotenv"
)

const (
	baseURL      = "https://www.sofascore.com/api/v1"
	userAgent    = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36"
	startEventID = 12900000
	batchSize    = 100
)

type APIResponse struct {
	Event EventDetails `json:"event"`
}

type EventDetails struct {
	ID          int64      `json:"id"`
	Tournament  Tournament `json:"tournament"`
	HomeTeam    Fighter    `json:"homeTeam"`
	AwayTeam    Fighter    `json:"awayTeam"`
	WeightClass string     `json:"weightClass"`
	FightType   string     `json:"fightType"`
	WinType     string     `json:"winType"`
}

type Tournament struct {
	Name     string `json:"name"`
	Location string `json:"location"`
}

type Fighter struct {
	Name           string         `json:"name"`
	PlayerTeamInfo PlayerTeamInfo `json:"playerTeamInfo"`
}

type PlayerTeamInfo struct {
	BirthDateTimestamp int64   `json:"birthDateTimestamp"`
	Height             float64 `json:"height"`
	Weight             float64 `json:"weight"`
	WeightClass        string  `json:"weightClass"`
	Reach              float64 `json:"reach"`
}

type MatchData struct {
	EventID     int64  `json:"event_id"`
	EventName   string `json:"event_name"`
	Location    string `json:"location"`
	Fighter1    string `json:"fighter1"`
	Fighter2    string `json:"fighter2"`
	WeightClass string `json:"weight_class"`
	FightType   string `json:"fight_type"`
	Date        string `json:"date"`
}

var userAgents = []string{
	"Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
	"Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.0 Safari/605.1.15",
	// ... add more user agents from the fighter scraper ...
}

func initializeClient() *http.Client {
	// Load .env file - continue without proxy if file doesn't exist
	if err := godotenv.Load(); err != nil {
		log.Printf("No .env file found, continuing without proxy")
		return &http.Client{Timeout: 10 * time.Second}
	}

	// Get proxy credentials from environment
	proxyUser := os.Getenv("PROXY_USERNAME")
	proxyPass := os.Getenv("PROXY_PASSWORD")
	proxyHost := os.Getenv("PROXY_HOST")
	proxyPort := os.Getenv("PROXY_PORT")

	// If any proxy settings are missing, continue without proxy
	if proxyUser == "" || proxyPass == "" || proxyHost == "" || proxyPort == "" {
		log.Printf("Proxy credentials incomplete in .env, continuing without proxy")
		return &http.Client{Timeout: 10 * time.Second}
	}

	// Configure the proxy URL
	proxyURL := fmt.Sprintf("http://%s:%s@%s:%s",
		proxyUser,
		proxyPass,
		proxyHost,
		proxyPort,
	)

	// Create proxy URL
	proxy, err := url.Parse(proxyURL)
	if err != nil {
		log.Printf("Error parsing proxy URL: %v, continuing without proxy", err)
		return &http.Client{Timeout: 10 * time.Second}
	}

	// Create transport with proxy
	transport := &http.Transport{
		Proxy: http.ProxyURL(proxy),
	}

	// Create client with transport
	client := &http.Client{
		Transport: transport,
		Timeout:   10 * time.Second,
	}

	log.Printf("Successfully configured proxy")
	return client
}

func main() {
	client := initializeClient()

	eventsChan := make(chan int, batchSize)
	resultsChan := make(chan *APIResponse)
	matchesChan := make(chan MatchData)

	// Add progress tracking
	processedCount := 0
	totalEvents := 100000 // Total events to process
	startTime := time.Now()

	// Start worker goroutines
	numWorkers := 5
	fmt.Printf("Starting %d workers to process %d events...\n", numWorkers, totalEvents)
	for i := 0; i < numWorkers; i++ {
		go worker(client, eventsChan, resultsChan)
	}

	// Start producer goroutine
	go func() {
		for eventID := startEventID; eventID < startEventID+totalEvents; eventID++ {
			eventsChan <- eventID
		}
		close(eventsChan)
		fmt.Println("All events queued for processing")
	}()

	// Start processor goroutine with progress tracking
	go func() {
		for response := range resultsChan {
			processedCount++

			// Log progress every 100 events
			if processedCount%100 == 0 {
				elapsed := time.Since(startTime)
				eventsPerSecond := float64(processedCount) / elapsed.Seconds()
				remainingEvents := totalEvents - processedCount
				estimatedRemaining := time.Duration(float64(remainingEvents)/eventsPerSecond) * time.Second

				fmt.Printf("Progress: %d/%d (%.2f%%) - %.2f events/sec - Est. remaining: %v\n",
					processedCount,
					totalEvents,
					float64(processedCount)/float64(totalEvents)*100,
					eventsPerSecond,
					estimatedRemaining.Round(time.Second),
				)
			}

			if response != nil && isUFCEvent(&response.Event) {
				match := processUFCEvent(&response.Event)
				if match != nil {
					matchesChan <- *match
				}
			}
		}
		close(matchesChan)
	}()

	// Collect matches with counter
	matches := []MatchData{}
	matchCount := 0
	for match := range matchesChan {
		matches = append(matches, match)
		matchCount++
		fmt.Printf("UFC match found (%d total): %s vs %s\n",
			matchCount,
			match.Fighter1,
			match.Fighter2,
		)
	}

	// Final summary
	elapsed := time.Since(startTime)
	fmt.Printf("\nScraping completed in %v\n", elapsed.Round(time.Second))
	fmt.Printf("Total events processed: %d\n", processedCount)
	fmt.Printf("UFC matches found: %d\n", matchCount)
	fmt.Printf("Average processing speed: %.2f events/sec\n",
		float64(processedCount)/elapsed.Seconds(),
	)

	if len(matches) > 0 {
		saveMatches(matches)
	}
}

func worker(client *http.Client, eventsChan <-chan int, resultsChan chan<- *APIResponse) {
	for eventID := range eventsChan {
		// Add small delay to prevent rate limiting
		time.Sleep(100 * time.Millisecond)

		event := fetchEvent(client, eventID)
		resultsChan <- event
	}
}

func fetchEvent(client *http.Client, eventID int) *APIResponse {
	url := fmt.Sprintf("%s/event/%d", baseURL, eventID)
	req, err := http.NewRequest("GET", url, nil)
	if err != nil {
		return nil
	}

	req.Header.Set("User-Agent", getRandomUserAgent())

	resp, err := client.Do(req)
	if err != nil {
		if strings.Contains(err.Error(), "407") {
			log.Printf("Proxy authentication failed: %v", err)
		}
		return nil
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		if resp.StatusCode == 407 {
			log.Printf("Proxy authentication required for event %d", eventID)
		} else if resp.StatusCode == 403 {
			log.Printf("Access forbidden (403) for event %d - might need to rotate proxy", eventID)
		}
		return nil
	}

	var apiResponse APIResponse
	if err := json.NewDecoder(resp.Body).Decode(&apiResponse); err != nil {
		return nil
	}

	return &apiResponse
}

func isUFCEvent(event *EventDetails) bool {
	return strings.Contains(strings.ToLower(event.Tournament.Name), "ufc")
}

func processUFCEvent(event *EventDetails) *MatchData {
	match := &MatchData{
		EventID:     event.ID,
		EventName:   event.Tournament.Name,
		Location:    event.Tournament.Location,
		Fighter1:    event.HomeTeam.Name,
		Fighter2:    event.AwayTeam.Name,
		WeightClass: event.WeightClass,
		FightType:   event.FightType,
		Date:        time.Now().Format("2006-01-02"),
	}

	fmt.Printf("Found UFC Event: %s vs %s at %s\n",
		match.Fighter1,
		match.Fighter2,
		match.EventName)

	return match
}

func saveMatches(matches []MatchData) {
	filename := fmt.Sprintf("matches_%s.json", time.Now().Format("2006-01-02_15-04-05"))
	file, err := json.MarshalIndent(matches, "", "  ")
	if err != nil {
		fmt.Printf("Error marshaling matches: %v\n", err)
		return
	}

	err = os.WriteFile(filename, file, 0644)
	if err != nil {
		fmt.Printf("Error saving matches: %v\n", err)
		return
	}

	fmt.Printf("Saved %d matches to %s\n", len(matches), filename)
}

func getRandomUserAgent() string {
	rand.Seed(time.Now().UnixNano())
	return userAgents[rand.Intn(len(userAgents))]
}
