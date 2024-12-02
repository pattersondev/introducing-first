package main

import (
	"bytes"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"os"
	"time"

	"github.com/joho/godotenv"
)

type NewsArticle struct {
	ID          string    `json:"id"`
	TweetID     string    `json:"tweet_id"`
	Content     string    `json:"content"`
	URL         string    `json:"url"`
	PublishedAt time.Time `json:"published_at"`
	CreatedAt   time.Time `json:"created_at"`
}

func main() {
	if err := godotenv.Load(); err != nil {
		log.Fatal("Error loading .env file")
	}

	bearerToken := os.Getenv("TWITTER_BEARER_TOKEN")
	if bearerToken == "" {
		log.Fatal("Missing Twitter bearer token")
	}

	// Get user ID for @mmafighting
	userID, err := getUserID(bearerToken, "mmafighting")
	if err != nil {
		log.Fatal("Failed to get user ID:", err)
	}

	log.Printf("Starting to monitor tweets from user ID: %s", userID)

	// Start monitoring tweets
	for {
		monitorTweets(bearerToken, userID)
		log.Println("Stream disconnected, reconnecting in 5 seconds...")
		time.Sleep(5 * time.Second)
	}
}

func getUserID(bearerToken, username string) (string, error) {
	url := fmt.Sprintf("https://api.twitter.com/2/users/by/username/%s", username)
	req, err := http.NewRequest("GET", url, nil)
	if err != nil {
		return "", err
	}

	req.Header.Add("Authorization", fmt.Sprintf("Bearer %s", bearerToken))

	client := &http.Client{}
	resp, err := client.Do(req)
	if err != nil {
		return "", err
	}
	defer resp.Body.Close()

	var result struct {
		Data struct {
			ID string `json:"id"`
		} `json:"data"`
	}

	if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
		return "", err
	}

	return result.Data.ID, nil
}

func monitorTweets(bearerToken, userID string) {
	url := fmt.Sprintf("https://api.twitter.com/2/users/%s/tweets?tweet.fields=created_at", userID)
	req, err := http.NewRequest("GET", url, nil)
	if err != nil {
		log.Printf("Error creating request: %v", err)
		return
	}

	req.Header.Add("Authorization", fmt.Sprintf("Bearer %s", bearerToken))

	client := &http.Client{}
	resp, err := client.Do(req)
	if err != nil {
		log.Printf("Error making request: %v", err)
		return
	}
	defer resp.Body.Close()

	var tweets struct {
		Data []struct {
			ID        string `json:"id"`
			Text      string `json:"text"`
			CreatedAt string `json:"created_at"`
		} `json:"data"`
	}

	if err := json.NewDecoder(resp.Body).Decode(&tweets); err != nil {
		log.Printf("Error decoding response: %v", err)
		return
	}

	// Process each tweet
	for _, tweet := range tweets.Data {
		createdAt, _ := time.Parse(time.RFC3339, tweet.CreatedAt)

		article := NewsArticle{
			ID:          fmt.Sprintf("tw_%s", tweet.ID),
			TweetID:     tweet.ID,
			Content:     tweet.Text,
			URL:         fmt.Sprintf("https://twitter.com/mmafighting/status/%s", tweet.ID),
			PublishedAt: createdAt,
			CreatedAt:   time.Now(),
		}

		if err := sendToScraperService(article); err != nil {
			log.Printf("Error sending article to scraper service: %v", err)
			continue
		}

		log.Printf("Saved new tweet: %s", tweet.Text)
	}
}

func sendToScraperService(article NewsArticle) error {
	baseURL := os.Getenv("SCRAPER_SERVICE_URL") + "/api/news/article"

	body, err := json.Marshal(article)
	if err != nil {
		return fmt.Errorf("error marshaling article: %v", err)
	}

	resp, err := http.Post(
		baseURL,
		"application/json",
		bytes.NewBuffer(body),
	)
	if err != nil {
		return fmt.Errorf("error sending request: %v", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return fmt.Errorf("received non-200 response: %d", resp.StatusCode)
	}

	return nil
}
