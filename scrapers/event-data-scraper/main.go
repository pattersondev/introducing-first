package main

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io/ioutil"
	"log"
	"math/rand"
	"net/http"
	"os"
	"regexp"
	"strings"
	"sync"
	"time"

	"github.com/gocolly/colly/v2"
	"github.com/gocolly/colly/v2/proxy"
	"github.com/joho/godotenv"
)

type Event struct {
	Name     string
	Date     string
	Location string
	Matchups []FightData
}

type FightData struct {
	Fighter1 string
	Fighter2 string
	Result   string
	Winner   string
	Order    int
}

type SendResult struct {
	event   Event
	err     error
	retries int
}

func main() {
	c := initializeCollector()
	events := scrapeData(c)

	fmt.Printf("Total events found: %d\n", len(events))

	writeEventDataToJSON(events)
	sendEventDataToAPI(events)
}

func initializeCollector() *colly.Collector {
	c := colly.NewCollector(
		colly.AllowedDomains("www.espn.com"),
		colly.IgnoreRobotsTxt(),
	)

	// Load .env file - continue without proxy if file doesn't exist
	if err := godotenv.Load(); err != nil {
		log.Printf("No .env file found, continuing without proxy")
		return c
	}

	// Get proxy credentials from environment
	proxyUser := os.Getenv("PROXY_USERNAME")
	proxyPass := os.Getenv("PROXY_PASSWORD")
	proxyHost := os.Getenv("PROXY_HOST")
	proxyPort := os.Getenv("PROXY_PORT")

	// If any proxy settings are missing, continue without proxy
	if proxyUser == "" || proxyPass == "" || proxyHost == "" || proxyPort == "" {
		log.Printf("Proxy credentials incomplete in .env, continuing without proxy")
		return c
	}

	// Configure the proxy
	proxyURL := fmt.Sprintf("http://%s:%s@%s:%s",
		proxyUser,
		proxyPass,
		proxyHost,
		proxyPort,
	)

	// Create a proxy switcher
	proxySwitcher, err := proxy.RoundRobinProxySwitcher(proxyURL)
	if err != nil {
		log.Printf("Error setting up proxy switcher: %v, continuing without proxy", err)
		return c
	}

	// Set the proxy function
	c.SetProxyFunc(proxySwitcher)

	// Add error handling for proxy-related issues
	c.OnError(func(r *colly.Response, err error) {
		if r.StatusCode == 407 { // Proxy Authentication Required
			log.Printf("Proxy authentication failed: %v", err)
		}
	})

	log.Printf("Successfully configured proxy")
	return c
}

func scrapeData(c *colly.Collector) []Event {
	var events []Event
	var mu sync.Mutex
	visitedURLs := make(map[string]bool)
	urlChan := make(chan string, 100)
	var wg sync.WaitGroup

	setupCollectorCallbacks(c, &events, &mu, visitedURLs)

	// Start worker goroutines
	for i := 0; i < 3; i++ { // Adjust the number of workers as needed
		wg.Add(1)
		go func() {
			defer wg.Done()
			worker(c, urlChan, &wg, visitedURLs, &mu)
		}()
	}

	// Send initial URL
	urlChan <- "https://www.espn.com/mma/fightcenter"

	// Close channel after all URLs have been sent
	go func() {
		wg.Wait()      // Wait for all workers to finish
		close(urlChan) // Then close the channel
	}()

	// Wait for all goroutines to finish before returning
	wg.Wait()

	return events
}

func worker(c *colly.Collector, urlChan chan string, wg *sync.WaitGroup, visitedURLs map[string]bool, mu *sync.Mutex) {
	defer wg.Done()

	for url := range urlChan {
		mu.Lock()
		if visitedURLs[url] {
			mu.Unlock()
			continue
		}
		visitedURLs[url] = true
		mu.Unlock()

		err := c.Visit(url)
		if err != nil {
			fmt.Printf("Error visiting %s: %v\n", url, err)
		}
	}
}

func setupCollectorCallbacks(c *colly.Collector, events *[]Event, mu *sync.Mutex, visitedURLs map[string]bool) {
	// fighterMap := make(map[string]*Fighter)

	c.OnRequest(func(r *colly.Request) {
		handleRequest(r)
	})

	c.OnHTML("a[href]", func(e *colly.HTMLElement) {
		handleLinks(e, c, visitedURLs, mu)
	})

	c.OnHTML("body", func(e *colly.HTMLElement) {
		currentURL := e.Request.URL.String()
		if strings.Contains(currentURL, "fightcenter") {
			// Check if this is a return to the initial URL
			if currentURL == "https://www.espn.com/mma/fightcenter" && len(*events) > 0 {
				fmt.Println("Returned to initial URL, finishing scraping...")
				mu.Lock()
				writeEventDataToJSON(*events)
				sendEventDataToAPI(*events)
				mu.Unlock()
				os.Exit(0)
			}

			event := extractEventData(e)
			mu.Lock()
			*events = append(*events, event)
			mu.Unlock()
			printEventInfo(event)
		} else {
			fmt.Println("Unhandled page type:", currentURL)
		}
	})
}

func handleLinks(e *colly.HTMLElement, c *colly.Collector, visitedURLs map[string]bool, mu *sync.Mutex) {
	link := e.Attr("href")
	absoluteURL := e.Request.AbsoluteURL(link)
	if shouldVisitURL(absoluteURL) {
		mu.Lock()
		if !visitedURLs[absoluteURL] {
			visitedURLs[absoluteURL] = true
			mu.Unlock()
			fmt.Println("Queuing", absoluteURL)
			c.Visit(absoluteURL)
		} else {
			mu.Unlock()
		}
	}
}

func shouldVisitURL(url string) bool {
	return (strings.Contains(url, "espn.com/mma/fightcenter") ||
		strings.Contains(url, "espn.com/mma/fighter/")) &&
		!strings.Contains(url, "news") && !strings.Contains(url, "stats") && !strings.Contains(url, "history") && !strings.Contains(url, "bio")
}

func extractEventData(e *colly.HTMLElement) Event {
	fmt.Println("Extracting event data from:", e.Request.URL.String())

	eventName := e.ChildText(".headline.headline__h1.mb3")
	if eventName == "" {
		eventName = e.ChildText("h1.headline") // Alternative selector
	}

	eventDate := e.ChildText(".n6.mb2")
	if eventDate == "" {
		eventDate = e.ChildText(".n6") // Alternative selector
	}
	eventDate = extractDateOnly(eventDate)

	eventLocation := e.ChildText("div.n8.clr-gray-04")
	if eventLocation == "" {
		eventLocation = e.ChildText(".n8") // Alternative selector
	}
	eventLocation = extractLocationOnly(eventLocation)

	event := Event{
		Name:     eventName,
		Date:     eventDate,
		Location: eventLocation,
		Matchups: []FightData{},
	}

	e.ForEach("div.MMAGamestrip", func(index int, el *colly.HTMLElement) {
		fighter1 := cleanFighterName(el.ChildText("div.MMACompetitor:first-child h2"))
		fighter2 := cleanFighterName(el.ChildText("div.MMACompetitor:last-child h2"))

		result := el.ChildText("div.Gamestrip__Overview .ScoreCell__Time--post")
		cleanedResult := cleanResult(result)

		var winner string
		if cleanedResult == "" {
			winner = ""
		} else if el.ChildAttr("svg.MMACompetitor__arrow", "class") != "" {
			if strings.Contains(el.ChildAttr("svg.MMACompetitor__arrow", "class"), "--reverse") {
				winner = fighter1
			} else {
				winner = fighter2
			}
		} else {
			winner = "Draw/No Contest"
		}

		if fighter1 != "" && fighter2 != "" && fighter1 != fighter2 {
			fight := FightData{
				Fighter1: fighter1,
				Fighter2: fighter2,
				Result:   cleanedResult,
				Winner:   winner,
				Order:    index,
			}
			event.Matchups = append(event.Matchups, fight)
		}
	})

	return event
}

func cleanFighterName(name string) string {
	// Remove any numbers (usually record) from the name
	name = regexp.MustCompile(`\d+-\d+-\d+`).ReplaceAllString(name, "")

	// Remove any text in parentheses
	name = regexp.MustCompile(`\(.*?\)`).ReplaceAllString(name, "")

	// Split the name by spaces and join all parts
	parts := strings.Fields(name)
	if len(parts) >= 2 {
		if len(parts) <= 3 {
			return strings.Join(parts, " ")
		}
		return strings.Join(parts[:3], " ") // If more than 3 parts, take first 3
	}

	return strings.TrimSpace(name)
}

func cleanResult(result string) string {
	result = strings.TrimSpace(result)
	if strings.Contains(strings.ToLower(result), "ppv") || strings.Contains(strings.ToLower(result), "espn+") {
		return "" // Return empty string for future fights
	}

	// Keep only the first part of the result (e.g., "FinalKO/TKOR1, 0:21")
	parts := strings.SplitN(result, "Final", 2)
	if len(parts) > 1 {
		return "Final" + strings.SplitN(parts[1], "Final", 2)[0]
	}
	return result
}

// Update this function to include the year
func extractDateOnly(fullText string) string {
	// Assuming the date is always at the beginning and in the format "Month Day, Year"
	dateParts := strings.SplitN(fullText, ",", 3)
	if len(dateParts) >= 2 {
		// Combine the month/day with the year
		return strings.TrimSpace(dateParts[0] + "," + dateParts[1])
	}
	return ""
}

func extractLocationOnly(fullText string) string {
	// List of keywords that typically appear after the location
	keywords := []string{"Final", "PPV", "ESPN+", "ESPN", "FOX", "FS1", "FS2", "Max"}

	// Find the first occurrence of any keyword
	index := len(fullText)
	for _, keyword := range keywords {
		if idx := strings.Index(fullText, keyword); idx != -1 && idx < index {
			index = idx
		}
	}

	// Extract the substring before the first keyword
	location := fullText[:index]

	// Remove any trailing commas and whitespace
	location = strings.TrimRight(location, ", ")

	return strings.TrimSpace(location)
}

func printEventInfo(event Event) {
	fmt.Printf("Event: %s, Date: %s, Location: %s\n", event.Name, event.Date, event.Location)
	fmt.Printf("Total matchups: %d\n", len(event.Matchups))
	for _, matchup := range event.Matchups {
		fmt.Printf("  %s vs %s - Result: %s, Winner: %s\n", matchup.Fighter1, matchup.Fighter2, matchup.Result, matchup.Winner)
	}
}

func handleRequest(r *colly.Request) {
	fmt.Println("Attempting to visit:", r.URL.String())

	// Set a random user agent
	r.Headers.Set("User-Agent", getRandomUserAgent())

	if strings.Contains(r.URL.String(), "radio") ||
		strings.Contains(r.URL.String(), "watch") ||
		strings.Contains(r.URL.String(), "news") {
		r.Abort()
		fmt.Println("Skipping", r.URL.String())
	} else {
		fmt.Println("Visiting", r.URL.String())
	}
}

func writeEventDataToJSON(events []Event) {
	jsonFileName := fmt.Sprintf("events%s.json", time.Now().Format("2006-01-02_15-04-05"))
	file, err := os.Create(jsonFileName)
	if err != nil {
		log.Fatal("Cannot create file", err)
	}
	defer file.Close()

	encoder := json.NewEncoder(file)
	encoder.SetIndent("", "  ")
	if err := encoder.Encode(events); err != nil {
		log.Fatal("Error writing to JSON:", err)
	}

	fmt.Printf("Event data JSON file created: %s\n", jsonFileName)
}

func sendEventDataToAPI(events []Event) {
	fmt.Println("Sending events to API")
	const (
		maxRetries   = 3
		workerCount  = 3
		delayBetween = 2 * time.Second
		retryDelay   = 30 * time.Second
	)

	queue := make(chan Event, len(events))
	results := make(chan SendResult, len(events))
	var wg sync.WaitGroup

	// Start workers
	for i := 0; i < workerCount; i++ {
		wg.Add(1)
		go func() {
			defer wg.Done()
			for event := range queue {
				result := sendEvent(event, maxRetries, retryDelay)
				results <- result
				time.Sleep(delayBetween) // Delay between requests
			}
		}()
	}

	// Send events to queue
	for _, event := range events {
		queue <- event
	}
	close(queue)

	// Wait for all workers to finish
	go func() {
		wg.Wait()
		close(results)
	}()

	// Process results
	var failed []SendResult
	for result := range results {
		if result.err != nil {
			log.Printf("Failed to send event %s after %d retries: %v",
				result.event.Name,
				result.retries,
				result.err)
			failed = append(failed, result)
		} else {
			log.Printf("Successfully sent event %s",
				result.event.Name)
		}
	}

	// Handle failed requests
	if len(failed) > 0 {
		log.Printf("Failed to send %d events. Writing to file...", len(failed))
		saveFailedToFile(failed)
	}
}

func sendEvent(event Event, maxRetries int, retryDelay time.Duration) SendResult {
	url := os.Getenv("SCRAPER_SERVICE_URL") + "/api/events"
	client := &http.Client{
		Timeout: 30 * time.Second,
	}

	retries := 0
	for retries < maxRetries {
		eventArray := []Event{event}

		eventData, err := json.Marshal(eventArray)
		if err != nil {
			return SendResult{event, err, retries}
		}

		req, err := http.NewRequest("POST", url, bytes.NewBuffer(eventData))
		if err != nil {
			return SendResult{event, err, retries}
		}

		// Add API key to request header
		req.Header.Set("X-API-Key", os.Getenv("API_KEY"))
		req.Header.Set("Content-Type", "application/json")

		resp, err := client.Do(req)
		if err != nil {
			retries++
			time.Sleep(retryDelay)
			continue
		}

		defer resp.Body.Close()
		body, _ := ioutil.ReadAll(resp.Body)

		// Log the response
		log.Printf("Server response: %s\n", string(body))

		if resp.StatusCode != http.StatusOK {
			retries++
			log.Printf("Server returned %d: %s", resp.StatusCode, string(body))
			time.Sleep(retryDelay)
			continue
		}

		return SendResult{event, nil, retries}
	}

	return SendResult{event, fmt.Errorf("max retries reached"), retries}
}

func saveFailedToFile(failed []SendResult) {
	timestamp := time.Now().Format("2006-01-02_15-04-05")
	filename := fmt.Sprintf("failed_events_%s.json", timestamp)

	events := make([]Event, len(failed))
	for i, result := range failed {
		events[i] = result.event
	}

	data, err := json.MarshalIndent(events, "", "  ")
	if err != nil {
		log.Printf("Error marshaling failed events: %v", err)
		return
	}

	err = ioutil.WriteFile(filename, data, 0644)
	if err != nil {
		log.Printf("Error writing failed events to file: %v", err)
		return
	}

	log.Printf("Failed events written to %s", filename)
}

// Add the user agent rotation function
func getRandomUserAgent() string {
	userAgents := []string{
		"Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
		"Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.0 Safari/605.1.15",
		"Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:89.0) Gecko/20100101 Firefox/89.0",
		// Add more user agents as needed...
	}
	return userAgents[rand.Intn(len(userAgents))]
}
