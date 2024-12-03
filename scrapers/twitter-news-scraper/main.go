package main

import (
	"bytes"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"os"
	"strings"
	"time"

	"github.com/go-rod/rod"
	"github.com/go-rod/rod/lib/launcher"
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

const (
	requestDelay = 1 * time.Minute
	cycleDelay   = 3 * time.Minute
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
		"RT @",
		"you",
		"roundtable",
	}

	text = strings.ToUpper(text)
	for _, pattern := range ignorePatterns {
		if strings.Contains(text, strings.ToUpper(pattern)) {
			return true
		}
	}
	return false
}

func generateTweetID(content string, username string) string {
	hasher := sha256.New()
	hasher.Write([]byte(content + username))
	return hex.EncodeToString(hasher.Sum(nil))[:32]
}

func main() {
	if err := godotenv.Load(); err != nil {
		log.Fatal("Error loading .env file")
	}

	accounts := []string{"mmafighting", "mmajunkie", "UFCNews"}
	log.Printf("Starting to monitor tweets from %d accounts", len(accounts))

	// Launch browser
	url := launcher.New().
		Headless(true).
		MustLaunch()

	browser := rod.New().
		ControlURL(url).
		MustConnect()
	defer browser.MustClose()

	// Create a new page
	page := browser.MustPage()
	defer page.MustClose()

	// Set viewport
	page.MustSetWindow(0, 0, 1920, 1080)

	for {
		for _, username := range accounts {
			log.Printf("Starting scrape for %s", username)

			// Visit the profile
			twitterURL := fmt.Sprintf("https://twitter.com/%s", username)
			if err := scrapeTweets(page, twitterURL); err != nil {
				log.Printf("Error scraping %s: %v", username, err)
				continue
			}

			log.Printf("Completed scrape for %s", username)
			log.Printf("Waiting %v before next account", requestDelay)
			time.Sleep(requestDelay)
		}

		log.Printf("Completed checking all accounts")
		log.Printf("Waiting %v before next cycle", cycleDelay)
		time.Sleep(cycleDelay)
	}
}

func scrapeTweets(page *rod.Page, url string) error {
	// Navigate to the page
	log.Printf("Navigating to %s", url)
	err := page.Navigate(url)
	if err != nil {
		return fmt.Errorf("navigation error: %v", err)
	}

	// Wait for the page to load
	err = page.WaitLoad()
	if err != nil {
		return fmt.Errorf("load error: %v", err)
	}

	// Wait for tweets to appear
	log.Printf("Waiting for tweets to load")
	page.MustWait(`() => document.querySelectorAll('article[data-testid="tweet"]').length > 0`)

	// Get only the first (most recent) tweet
	tweet, err := page.Element("article[data-testid='tweet']")
	if err != nil {
		return fmt.Errorf("tweet selection error: %v", err)
	}

	log.Printf("Found most recent tweet")

	// Extract tweet content
	contentElement, err := tweet.Element("div[data-testid='tweetText']")
	if err != nil {
		log.Printf("Error finding tweet content: %v", err)
		return nil
	}

	content, err := contentElement.Text()
	if err != nil {
		log.Printf("Error getting tweet text: %v", err)
		return nil
	}

	if content == "" || shouldIgnoreTweet(content) {
		log.Printf("Skipping tweet: %s", content)
		return nil
	}

	// Get tweet URL and ID
	timeElement, err := tweet.Element("time")
	if err != nil {
		log.Printf("Error finding time element: %v", err)
		return nil
	}

	parent, err := timeElement.Parent()
	if err != nil {
		log.Printf("Error finding time parent: %v", err)
		return nil
	}

	href, err := parent.Attribute("href")
	if err != nil {
		log.Printf("Error getting href: %v", err)
		return nil
	}

	tweetURL := fmt.Sprintf("https://twitter.com%s", *href)
	parts := strings.Split(*href, "/")
	tweetID := parts[len(parts)-1]

	// Get timestamp
	timestamp, err := timeElement.Attribute("datetime")
	if err != nil {
		log.Printf("Error getting timestamp: %v", err)
		return nil
	}

	publishedAt, err := time.Parse(time.RFC3339, *timestamp)
	if err != nil {
		log.Printf("Error parsing timestamp: %v", err)
		publishedAt = time.Now()
	}

	article := NewsArticle{
		ID:          fmt.Sprintf("tw_%s", tweetID),
		TweetID:     tweetID,
		Content:     strings.TrimSpace(content),
		URL:         tweetURL,
		PublishedAt: publishedAt,
		CreatedAt:   time.Now(),
	}

	log.Printf("Processing tweet: %s", content)
	if err := sendToScraperService(article); err != nil {
		if strings.Contains(err.Error(), "409") {
			log.Printf("Duplicate tweet found: %s", tweetID)
		} else {
			log.Printf("Error sending article to service: %v", err)
		}
	} else {
		log.Printf("Successfully processed tweet")
	}

	return nil
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

	if resp.StatusCode == http.StatusConflict {
		return fmt.Errorf("409: duplicate article")
	}

	if resp.StatusCode != http.StatusOK {
		return fmt.Errorf("received non-200 response: %d", resp.StatusCode)
	}

	return nil
}
