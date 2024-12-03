package main

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"
	"os"
	"strconv"
	"strings"
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

type LastTweetTracker struct {
	lastSeenID string
	username   string
}

var trackers = make(map[string]*LastTweetTracker)

const (
	requestDelay = 40 * time.Second // ~90 requests per hour (well under the 100/hour limit)
	maxRetries   = 3
	cycleDelay   = 2 * time.Minute // Longer delay between cycles
)

func shouldIgnoreTweet(text string) bool {
	ignorePatterns := []string{
		"Join",
		"LIVE",
		"Watch",
		"as they react",
		"tune in",
		"Trivia",
		"daily",
		"edition",
		"UFC trivia",
		"game",
		"Monday",
		"Tuesday",
		"Wednesday",
		"Thursday",
		"Sunday",
	}

	text = strings.ToUpper(text)
	for _, pattern := range ignorePatterns {
		if strings.Contains(text, strings.ToUpper(pattern)) {
			return true
		}
	}
	return false
}

func main() {
	if err := godotenv.Load(); err != nil {
		log.Fatal("Error loading .env file")
	}

	bearerToken := os.Getenv("TWITTER_BEARER_TOKEN")
	if bearerToken == "" {
		log.Fatal("Missing Twitter bearer token")
	}

	// Add "Bearer" prefix if not present
	if !strings.HasPrefix(bearerToken, "Bearer ") {
		bearerToken = "Bearer " + bearerToken
	}

	// Track multiple accounts
	accounts := []string{"mmafighting", "mmajunkie"}
	userIDs := make([]string, 0)

	// Get user IDs for all accounts
	for _, account := range accounts {
		userID, err := getUserID(bearerToken, account)
		if err != nil {
			log.Printf("Failed to get user ID for %s: %v", account, err)
			continue
		}
		userIDs = append(userIDs, userID)
		trackers[userID] = &LastTweetTracker{
			username: account,
		}
		log.Printf("Found user ID for %s: %s", account, userID)
	}

	if len(userIDs) == 0 {
		log.Fatal("No valid user IDs found")
	}

	log.Printf("Starting to monitor tweets from %d accounts", len(userIDs))
	log.Printf("Using delays: %v between requests, %v between cycles", requestDelay, cycleDelay)

	// Start monitoring tweets from all accounts
	for {
		for _, userID := range userIDs {
			monitorTweets(bearerToken, userID)
			time.Sleep(requestDelay) // 40 seconds between each account check
		}
		log.Println("Completed checking all accounts, waiting before next cycle...")
		time.Sleep(cycleDelay) // 2 minutes between cycles
	}
}

func handleRateLimitWithRetry(resp *http.Response, retryCount int) bool {
	if retryCount >= maxRetries {
		log.Printf("Max retries reached, giving up")
		return false
	}

	retryAfter := resp.Header.Get("x-rate-limit-reset")
	resetTime, err := strconv.ParseInt(retryAfter, 10, 64)
	if err != nil {
		// If we can't parse the reset time, use exponential backoff
		waitTime := time.Duration(retryCount+1) * 30 * time.Second
		log.Printf("Rate limited, waiting for %v (retry %d/%d)", waitTime, retryCount+1, maxRetries)
		time.Sleep(waitTime)
		return true
	}

	// Use the rate limit reset time from Twitter
	waitTime := time.Until(time.Unix(resetTime, 0))
	if waitTime < 0 {
		waitTime = time.Duration(retryCount+1) * 30 * time.Second
	}
	log.Printf("Rate limited, waiting for %v until %v (retry %d/%d)",
		waitTime, time.Unix(resetTime, 0), retryCount+1, maxRetries)
	time.Sleep(waitTime)
	return true
}

func getUserID(bearerToken, username string) (string, error) {
	for retryCount := 0; retryCount < maxRetries; retryCount++ {
		url := fmt.Sprintf("https://api.twitter.com/2/users/by/username/%s", username)
		req, err := http.NewRequest("GET", url, nil)
		if err != nil {
			return "", err
		}

		req.Header.Set("Authorization", bearerToken)

		client := &http.Client{}
		resp, err := client.Do(req)
		if err != nil {
			return "", err
		}

		if resp.StatusCode == 429 {
			resp.Body.Close()
			if handleRateLimitWithRetry(resp, retryCount) {
				continue
			}
			return "", fmt.Errorf("rate limit exceeded after %d retries", maxRetries)
		}

		var result struct {
			Data struct {
				ID string `json:"id"`
			} `json:"data"`
		}

		if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
			return "", fmt.Errorf("error decoding response: %v", err)
		}

		if result.Data.ID == "" {
			return "", fmt.Errorf("no user ID found for username: %s", username)
		}

		return result.Data.ID, nil
	}
	return "", fmt.Errorf("max retries exceeded")
}

func monitorTweets(bearerToken, userID string) {
	for retryCount := 0; retryCount < maxRetries; retryCount++ {
		url := fmt.Sprintf("https://api.twitter.com/2/users/%s/tweets?tweet.fields=created_at&exclude=retweets,replies,quote_tweets&max_results=100", userID)
		if trackers[userID].lastSeenID != "" {
			url = fmt.Sprintf("%s&since_id=%s", url, trackers[userID].lastSeenID)
		}

		req, err := http.NewRequest("GET", url, nil)
		if err != nil {
			log.Printf("Error creating request: %v", err)
			return
		}

		req.Header.Set("Authorization", bearerToken)

		client := &http.Client{}
		resp, err := client.Do(req)
		if err != nil {
			log.Printf("Error making request: %v", err)
			return
		}

		if resp.StatusCode == 429 {
			resp.Body.Close()
			if handleRateLimitWithRetry(resp, retryCount) {
				continue
			}
			return
		}

		body, err := io.ReadAll(resp.Body)
		if err != nil {
			log.Printf("Error reading response body: %v", err)
			return
		}

		var tweets struct {
			Data []struct {
				ID        string `json:"id"`
				Text      string `json:"text"`
				CreatedAt string `json:"created_at"`
			} `json:"data"`
		}

		if err := json.Unmarshal(body, &tweets); err != nil {
			log.Printf("Error decoding response: %v, body: %s", err, string(body))
			return
		}

		if len(tweets.Data) > 0 {
			trackers[userID].lastSeenID = tweets.Data[0].ID
		}

		// Process tweets in reverse order (oldest first)
		for i := len(tweets.Data) - 1; i >= 0; i-- {
			tweet := tweets.Data[i]
			if shouldIgnoreTweet(tweet.Text) {
				continue
			}

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
		return // Success, exit retry loop
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
