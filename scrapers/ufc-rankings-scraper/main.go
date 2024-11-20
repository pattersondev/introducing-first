package main

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io/ioutil"
	"log"
	"net/http"
	"net/url"
	"os"
	"sync"
	"time"

	"github.com/joho/godotenv"
)

type Fighter struct {
	Name          string     `json:"name"`
	Slug          string     `json:"slug"`
	ShortName     string     `json:"shortName"`
	Gender        string     `json:"gender"`
	UserCount     int        `json:"userCount"`
	NameCode      string     `json:"nameCode"`
	Ranking       int        `json:"ranking"`
	Disabled      bool       `json:"disabled"`
	National      bool       `json:"national"`
	Type          int        `json:"type"`
	ID            int        `json:"id"`
	Country       Country    `json:"country"`
	TeamColors    TeamColors `json:"teamColors"`
	WinLossRecord Record     `json:"wdlRecord"`
}

type Country struct {
	Alpha2 string `json:"alpha2"`
	Alpha3 string `json:"alpha3"`
	Name   string `json:"name"`
	Slug   string `json:"slug"`
}

type TeamColors struct {
	Primary   string `json:"primary"`
	Secondary string `json:"secondary"`
	Text      string `json:"text"`
}

type Record struct {
	Wins   int `json:"wins"`
	Draws  int `json:"draws"`
	Losses int `json:"losses"`
}

type RankingResponse struct {
	RankingType struct {
		Name string `json:"name"`
		ID   int    `json:"id"`
	} `json:"rankingType"`
	RankingRows []struct {
		Team     Fighter `json:"team"`
		Position int     `json:"position"`
		Name     string  `json:"name"`
		ID       int     `json:"id"`
	} `json:"rankingRows"`
}

type WeightClassRanking struct {
	WeightClass string `json:"weightClass"`
	Rankings    []struct {
		Name     string `json:"name"`
		Position int    `json:"position"`
	} `json:"rankings"`
}

func initializeClient() *http.Client {
	// Load .env file
	if err := godotenv.Load(); err != nil {
		log.Printf("No .env file found, continuing without proxy")
		return &http.Client{Timeout: 30 * time.Second}
	}

	// Get proxy credentials from environment
	proxyUser := os.Getenv("PROXY_USERNAME")
	proxyPass := os.Getenv("PROXY_PASSWORD")
	proxyHost := os.Getenv("PROXY_HOST")
	proxyPort := os.Getenv("PROXY_PORT")

	// If any proxy settings are missing, continue without proxy
	if proxyUser == "" || proxyPass == "" || proxyHost == "" || proxyPort == "" {
		log.Printf("Proxy credentials incomplete in .env, continuing without proxy")
		return &http.Client{Timeout: 30 * time.Second}
	}

	// Configure proxy URL
	proxyURL := fmt.Sprintf("http://%s:%s@%s:%s",
		proxyUser,
		proxyPass,
		proxyHost,
		proxyPort,
	)

	// Create transport with proxy
	transport := &http.Transport{
		Proxy: func(req *http.Request) (*url.URL, error) {
			return url.Parse(proxyURL)
		},
	}

	return &http.Client{
		Transport: transport,
		Timeout:   30 * time.Second,
	}
}

func fetchRankings(client *http.Client, weightClassID int) (*RankingResponse, error) {
	url := fmt.Sprintf("https://www.sofascore.com/api/v1/rankings/%d", weightClassID)

	req, err := http.NewRequest("GET", url, nil)
	if err != nil {
		return nil, fmt.Errorf("error creating request: %v", err)
	}

	// Add headers to mimic browser request
	req.Header.Set("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36")
	req.Header.Set("Accept", "application/json")
	req.Header.Set("Referer", "https://www.sofascore.com/")

	resp, err := client.Do(req)
	if err != nil {
		return nil, fmt.Errorf("error making request: %v", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("received non-200 response: %d", resp.StatusCode)
	}

	body, err := ioutil.ReadAll(resp.Body)
	if err != nil {
		return nil, fmt.Errorf("error reading response body: %v", err)
	}

	var rankings RankingResponse
	if err := json.Unmarshal(body, &rankings); err != nil {
		return nil, fmt.Errorf("error unmarshaling JSON: %v", err)
	}

	return &rankings, nil
}

func sendRankingsToAPI(rankings []WeightClassRanking) error {
	url := "https://introducing-first.onrender.com/api/fighters/rankings"
	jsonData, err := json.Marshal(rankings)
	if err != nil {
		return fmt.Errorf("error marshaling rankings: %v", err)
	}

	req, err := http.NewRequest("POST", url, bytes.NewBuffer(jsonData))
	if err != nil {
		return fmt.Errorf("error creating request: %v", err)
	}
	req.Header.Set("Content-Type", "application/json")

	client := &http.Client{Timeout: 30 * time.Second}
	resp, err := client.Do(req)
	if err != nil {
		return fmt.Errorf("error sending request: %v", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		body, _ := ioutil.ReadAll(resp.Body)
		return fmt.Errorf("received non-200 response: %d - %s", resp.StatusCode, string(body))
	}

	return nil
}

func main() {
	client := initializeClient()
	var wg sync.WaitGroup
	var mu sync.Mutex
	allRankings := make([]WeightClassRanking, 0)

	// Weight classes from 11 to 21
	for i := 11; i <= 21; i++ {
		wg.Add(1)
		go func(weightClassID int) {
			defer wg.Done()

			rankings, err := fetchRankings(client, weightClassID)
			if err != nil {
				log.Printf("Error fetching rankings for weight class %d: %v", weightClassID, err)
				return
			}

			// Create properly formatted rankings data
			var formattedRankings []struct {
				Name     string `json:"name"`
				Position int    `json:"position"`
			}

			for _, row := range rankings.RankingRows {
				formattedRankings = append(formattedRankings, struct {
					Name     string `json:"name"`
					Position int    `json:"position"`
				}{
					Name:     row.Name, // This contains "LastName, FirstName"
					Position: row.Position,
				})
			}

			weightClassRanking := WeightClassRanking{
				WeightClass: rankings.RankingType.Name,
				Rankings:    formattedRankings,
			}

			mu.Lock()
			allRankings = append(allRankings, weightClassRanking)
			mu.Unlock()

			log.Printf("Successfully fetched rankings for %s", rankings.RankingType.Name)
		}(i)

		// Add delay between requests to avoid rate limiting
		time.Sleep(2 * time.Second)
	}

	wg.Wait()

	// Write results to file
	jsonData, err := json.MarshalIndent(allRankings, "", "  ")
	if err != nil {
		log.Fatalf("Error marshaling JSON: %v", err)
	}

	err = ioutil.WriteFile("ufc_rankings.json", jsonData, 0644)
	if err != nil {
		log.Fatalf("Error writing JSON to file: %v", err)
	}

	log.Println("Successfully wrote rankings to ufc_rankings.json")

	// After writing to file, send to API
	if err := sendRankingsToAPI(allRankings); err != nil {
		log.Printf("Error sending rankings to API: %v", err)
	} else {
		log.Println("Successfully sent rankings to API")
	}
}
