package main

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"math/rand"
	"net/http"
	"net/url"
	"os"
	"strings"
	"sync"
	"time"

	"github.com/joho/godotenv"
)

// 12967296
// 12948654
// 12967105
// 13114222
// 12967102
//13093514

//FIRST
// 13114231

//13114223
//13114222
//13114101

const (
	baseURL      = "https://www.sofascore.com/api/v1"
	userAgent    = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36"
	startEventID = 13114000
	batchSize    = 100
)

type APIResponse struct {
	Event EventDetails `json:"event"`
}

type EventDetails struct {
	ID             int64      `json:"id"`
	Tournament     Tournament `json:"tournament"`
	HomeTeam       Fighter    `json:"homeTeam"`
	AwayTeam       Fighter    `json:"awayTeam"`
	WeightClass    string     `json:"weightClass"`
	FightType      string     `json:"fightType"`
	WinType        string     `json:"winType"`
	StartTimestamp int64      `json:"startTimestamp"`
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
	LiveID      int64  `json:"live_id"`
	EventName   string `json:"event_name"`
	Location    string `json:"location"`
	Fighter1    string `json:"fighter1"`
	Fighter2    string `json:"fighter2"`
	WeightClass string `json:"weight_class"`
	FightType   string `json:"fight_type"`
	Date        string `json:"date"`
	StartTime   string `json:"start_time"`
}

var userAgents = []string{
	"Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
	"Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.0 Safari/605.1.15",
	"Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:89.0) Gecko/20100101 Firefox/89.0",
	"Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.101 Safari/537.36",
	"Mozilla/5.0 (iPhone; CPU iPhone OS 14_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.0 Mobile/15E148 Safari/604.1",
	"Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/92.0.4515.159 Safari/537.36",
	"Mozilla/5.0 (Macintosh; Intel Mac OS X 11_5_2) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/92.0.4515.159 Safari/537.36",
	"Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:91.0) Gecko/20100101 Firefox/91.0",
	"Mozilla/5.0 (X11; Ubuntu; Linux x86_64; rv:91.0) Gecko/20100101 Firefox/91.0",
	"Mozilla/5.0 (iPad; CPU OS 14_7_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.0 Mobile/15E148 Safari/604.1",
	"Mozilla/5.0 (Android 11; Mobile; rv:91.0) Gecko/91.0 Firefox/91.0",
	"Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/92.0.4515.159 Safari/537.36 Edg/92.0.902.78",
	"Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/92.0.4515.159 Safari/537.36 OPR/78.0.4093.184",
	"Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/93.0.4577.63 Safari/537.36",
	"Mozilla/5.0 (Macintosh; Intel Mac OS X 11_6) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/93.0.4577.63 Safari/537.36",
	"Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:92.0) Gecko/20100101 Firefox/92.0",
	"Mozilla/5.0 (iPhone; CPU iPhone OS 15_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/15.0 Mobile/15E148 Safari/604.1",
	"Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/93.0.4577.63 Safari/537.36 Edg/93.0.961.38",
	"Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/93.0.4577.63 Safari/537.36",
	"Mozilla/5.0 (Android 12; Mobile; rv:92.0) Gecko/92.0 Firefox/92.0",
	"Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/15.0 Safari/605.1.15",
	"Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/93.0.4577.63 Safari/537.36 OPR/79.0.4143.22",
	"Mozilla/5.0 (iPad; CPU OS 15_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/15.0 Mobile/15E148 Safari/604.1",
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
	resultsChan := make(chan *APIResponse, batchSize)
	matchesChan := make(chan MatchData, batchSize)

	// Add progress tracking
	processedCount := 0
	totalEvents := 4000 // Total events to process
	startTime := time.Now()

	// Start worker goroutines
	numWorkers := 5
	var wg sync.WaitGroup
	fmt.Printf("Starting %d workers to process %d events...\n", numWorkers, totalEvents)

	for i := 0; i < numWorkers; i++ {
		wg.Add(1)
		go func() {
			defer wg.Done()
			worker(client, eventsChan, resultsChan)
		}()
	}

	// Start producer goroutine
	go func() {
		for eventID := startEventID; eventID < startEventID+totalEvents; eventID++ {
			eventsChan <- eventID
		}
		close(eventsChan)
		fmt.Println("All events queued for processing")
	}()

	// Start a goroutine to close resultsChan after all workers are done
	go func() {
		wg.Wait()
		close(resultsChan)
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

	// Collect matches
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
		if err := updateMatchupsInDatabase(matches); err != nil {
			log.Printf("Error updating matchups in database: %v", err)
		}
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
	// Convert Unix timestamp to time.Time
	startTime := time.Unix(event.StartTimestamp, 0)

	match := &MatchData{
		LiveID:      event.ID,
		EventName:   event.Tournament.Name,
		Location:    event.Tournament.Location,
		Fighter1:    event.HomeTeam.Name,
		Fighter2:    event.AwayTeam.Name,
		WeightClass: event.WeightClass,
		FightType:   event.FightType,
		Date:        startTime.Format("2006-01-02"),
		StartTime:   startTime.Format("15:04:05"),
	}

	fmt.Printf("Found UFC Event: %s vs %s at %s (Start time: %s)\n",
		match.Fighter1,
		match.Fighter2,
		match.EventName,
		match.StartTime)

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

func updateMatchupsInDatabase(matches []MatchData) error {
	// Construct the URL for the scraper service
	baseURL := os.Getenv("SCRAPER_SERVICE_URL")
	if baseURL == "" {
		baseURL = "http://localhost:3001" // Default to localhost if not set
	}

	for _, match := range matches {
		// Create request body
		body, err := json.Marshal(match)
		if err != nil {
			fmt.Printf("Error marshaling match data: %v\n", err)
			continue
		}

		// Log the request body
		fmt.Printf("Sending request body: %s\n", string(body))

		// Send POST request to update matchup
		resp, err := http.Post(
			fmt.Sprintf("%s/api/events/matchup/live-data", baseURL),
			"application/json",
			bytes.NewBuffer(body),
		)
		if err != nil {
			fmt.Printf("Error updating matchup in database: %v\n", err)
			continue
		}

		// Read and log response body
		respBody, err := io.ReadAll(resp.Body)
		if err != nil {
			fmt.Printf("Error reading response body: %v\n", err)
		} else {
			fmt.Printf("Response from server: %s\n", string(respBody))
		}

		resp.Body.Close()

		fmt.Printf("Updated live data for matchup: %s vs %s\n",
			match.Fighter1,
			match.Fighter2,
		)
	}
	return nil
}
