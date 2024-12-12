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
		"as they react",
		"tune in",
		"Trivia",
		"daily",
		"edition",
		"trivia",
		"game",
		"Monday",
		"Tuesday",
		"Wednesday",
		"Thursday",
		"Sunday",
		"predictions",
		"RT @",
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

	// Start the HTTP server in a goroutine
	go startServer()

	// Continuously try to run the scraper
	for {
		// Recover from panics
		func() {
			defer func() {
				if r := recover(); r != nil {
					log.Printf("Recovered from panic: %v", r)
					log.Println("Waiting 30 seconds before restarting...")
					time.Sleep(30 * time.Second)
				}
			}()

			launch()
		}()

		log.Println("Process crashed or stopped, restarting...")
	}
}

func startServer() {
	port := os.Getenv("PORT")
	if port == "" {
		port = "10000" // Render's default port
	}

	mux := http.NewServeMux()
	mux.HandleFunc("/health", func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
		w.Write([]byte("OK"))
	})

	server := &http.Server{
		Addr:    "0.0.0.0:" + port, // Explicitly bind to 0.0.0.0
		Handler: mux,
	}

	log.Printf("Starting health check server on 0.0.0.0:%s", port)
	if err := server.ListenAndServe(); err != nil {
		log.Printf("Error starting server: %v", err)
	}
}

func launch() {
	accounts := []string{"mmafighting", "UFCRosterWatch", "happypunch", "mmajunkie", "UFCNews", "espnmma"}
	log.Printf("Starting to monitor tweets from %d accounts", len(accounts))
	for {
		// Launch browser inside the main loop
		url := launcher.New().
			Headless(true).
			MustLaunch()

		browser := rod.New().
			ControlURL(url).
			MustConnect()

		// Create a new page
		page := browser.MustPage()

		// Set viewport
		page.MustSetWindow(0, 0, 1920, 1080)

		for _, username := range accounts {
			log.Printf("Starting scrape for %s", username)

			// Visit the profile
			twitterURL := fmt.Sprintf("https://twitter.com/%s", username)
			if err := scrapeTweets(page, twitterURL); err != nil {
				log.Printf("Error scraping %s: %v", username, err)
				// Safely close resources
				safeClose(page, browser)
				break
			}

			log.Printf("Completed scrape for %s", username)
			log.Printf("Waiting %v before next account", requestDelay)
			time.Sleep(requestDelay)
		}

		// Clean up resources if we haven't already
		safeClose(page, browser)

		log.Printf("Completed checking all accounts")
		log.Printf("Waiting %v before next cycle", cycleDelay)
		time.Sleep(cycleDelay)
	}
}

// safeClose safely closes page and browser without panicking
func safeClose(page *rod.Page, browser *rod.Browser) {
	if page != nil {
		// Use Close() instead of MustClose() to avoid panics
		if err := page.Close(); err != nil {
			log.Printf("Error closing page: %v", err)
		}
	}
	if browser != nil {
		if err := browser.Close(); err != nil {
			log.Printf("Error closing browser: %v", err)
		}
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

	// Check if this is a tweet from the account we're scraping
	authorElement, err := tweet.Element(`[data-testid="User-Name"] a[role="link"]`)
	if err != nil {
		log.Printf("Error finding author element: %v", err)
		return nil
	}

	authorHref, err := authorElement.Attribute("href")
	if err != nil {
		log.Printf("Error getting author href: %v", err)
		return nil
	}

	// Debug logging
	log.Printf("Raw author href: %s", *authorHref)

	// Extract username from URL and compare with expected
	authorUsername := strings.TrimPrefix(*authorHref, "/")
	log.Printf("After TrimPrefix: %s", authorUsername)

	authorUsername = strings.Split(authorUsername, "/")[0]
	log.Printf("After split on /: %s", authorUsername)

	authorUsername = strings.Split(authorUsername, "?")[0]
	log.Printf("After split on ?: %s", authorUsername)

	expectedUsername := strings.TrimPrefix(url, "https://twitter.com/")
	expectedUsername = strings.Split(expectedUsername, "/")[0]

	// Convert both to lowercase for case-insensitive comparison
	authorUsername = strings.ToLower(authorUsername)
	expectedUsername = strings.ToLower(expectedUsername)

	log.Printf("Final comparison: author='%s' expected='%s'", authorUsername, expectedUsername)

	if authorUsername != expectedUsername {
		log.Printf("Skipping retweet from @%s (expected @%s)", authorUsername, expectedUsername)
		return nil
	}

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
