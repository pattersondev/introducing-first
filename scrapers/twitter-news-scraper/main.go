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

	"regexp"

	"github.com/gocolly/colly/v2"
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
	requestDelay = 1 * time.Minute // Delay between checking different accounts
	maxRetries   = 3
	cycleDelay   = 58 * time.Minute // Wait almost an hour between cycles
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
		"predictions",
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

	log.Printf("Starting to monitor tweets from %d accounts (checking hourly)", len(userIDs))
	log.Printf("Using delays: %v between accounts, full cycle every %v", requestDelay, cycleDelay+requestDelay)

	// Start monitoring tweets from all accounts
	for {
		for _, userID := range userIDs {
			monitorTweets(bearerToken, userID)
			time.Sleep(requestDelay) // 1 minute between each account check
		}
		log.Println("Completed checking all accounts, waiting before next cycle...")
		time.Sleep(cycleDelay) // 58 minutes between cycles
	}
}

func handleRateLimitWithRetry(resp *http.Response, retryCount int, userID string) bool {
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

	// Only attempt scraping if we have a valid userID and tracker
	if userID != "" {
		if tracker, exists := trackers[userID]; exists {
			scrapeTwitterFallback(tracker.username)
		}
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
			if handleRateLimitWithRetry(resp, retryCount, "") {
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

func scrapeTwitterFallback(username string) error {
	c := colly.NewCollector()
	tweetRegex := regexp.MustCompile(`(?s)<article.*?tweet.*?>.*?</article>`)

	fmt.Println("Scraping tweets from", username)

	c.OnHTML("body", func(e *colly.HTMLElement) {
		tweets := tweetRegex.FindAllString(e.Text, -1)
		for _, tweet := range tweets {
			if shouldIgnoreTweet(tweet) {
				log.Printf("Ignoring scraped tweet from %s", username)
				continue
			}

			// Create article from scraped tweet
			article := NewsArticle{
				ID:          fmt.Sprintf("tw_scrape_%d", time.Now().UnixNano()),
				Content:     tweet,
				URL:         fmt.Sprintf("https://twitter.com/%s", username),
				PublishedAt: time.Now(),
				CreatedAt:   time.Now(),
			}

			if err := sendToScraperService(article); err != nil {
				log.Printf("Error sending scraped article to service: %v", err)
				continue
			}

			log.Printf("Saved scraped tweet from %s: %s", username, tweet)
		}
	})

	url := fmt.Sprintf("https://twitter.com/%s", username)
	return c.Visit(url)
}

func monitorTweets(bearerToken, userID string) {
	for retryCount := 0; retryCount < maxRetries; retryCount++ {
		url := fmt.Sprintf("https://api.twitter.com/2/users/%s/tweets?tweet.fields=created_at&exclude=retweets,replies&max_results=100", userID)
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
		defer resp.Body.Close()

		// Handle different status codes
		switch resp.StatusCode {
		case http.StatusOK:
			// Continue with processing
		case http.StatusNoContent:
			log.Printf("No new tweets for user ID: %s", userID)
			return
		case 429:
			if retryCount == maxRetries-1 {
				// On last retry, attempt web scraping fallback
				log.Printf("API rate limited, falling back to web scraping for %s", trackers[userID].username)
				if err := scrapeTwitterFallback(trackers[userID].username); err != nil {
					log.Printf("Fallback scraping failed: %v", err)
				}
				return
			}
			if handleRateLimitWithRetry(resp, retryCount, userID) {
				continue
			}
			return
		default:
			body, _ := io.ReadAll(resp.Body)
			log.Printf("Unexpected status code %d: %s", resp.StatusCode, string(body))
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

		// Log when we find tweets
		if len(tweets.Data) > 0 {
			log.Printf("Found %d tweets for user ID: %s", len(tweets.Data), userID)
			trackers[userID].lastSeenID = tweets.Data[0].ID
		} else {
			log.Printf("No new tweets found for user ID: %s", userID)
		}

		// Process tweets in reverse order (oldest first)
		for i := len(tweets.Data) - 1; i >= 0; i-- {
			tweet := tweets.Data[i]
			if shouldIgnoreTweet(tweet.Text) {
				log.Printf("Ignoring tweet: %s", tweet.Text)
				continue
			}

			createdAt, _ := time.Parse(time.RFC3339, tweet.CreatedAt)

			article := NewsArticle{
				ID:          fmt.Sprintf("tw_%s", tweet.ID),
				TweetID:     tweet.ID,
				Content:     tweet.Text,
				URL:         fmt.Sprintf("https://twitter.com/%s/status/%s", trackers[userID].username, tweet.ID),
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
