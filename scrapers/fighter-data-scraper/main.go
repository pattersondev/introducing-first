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
	"strings"
	"sync"
	"time"

	"github.com/gocolly/colly"
	"github.com/gocolly/colly/v2/proxy"
	"github.com/joho/godotenv"
	"golang.org/x/net/html"
)

type Fight struct {
	Date         string `json:"Date"`
	Opponent     string `json:"Opponent"`
	Event        string `json:"Event"`
	Result       string `json:"Result"`
	Decision     string `json:"Decision"`
	Rnd          string `json:"Rnd"`
	Time         string `json:"Time"`
	IsTitleFight bool   `json:"isTitleFight"`
}

type StrikingStats struct {
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

type ClinchStats struct {
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

type GroundStats struct {
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

type FighterStats struct {
	FirstName       string          `json:"FirstName"`
	LastName        string          `json:"LastName"`
	HeightAndWeight string          `json:"HeightAndWeight"`
	Birthdate       string          `json:"Birthdate"`
	Team            string          `json:"Team"`
	Nickname        string          `json:"Nickname"`
	Country         string          `json:"Country"`
	Reach           string          `json:"Reach"`
	Stance          string          `json:"Stance"`
	WinLossRecord   string          `json:"WinLossRecord"`
	TKORecord       string          `json:"TKORecord"`
	SubRecord       string          `json:"SubRecord"`
	StrikingStats   []StrikingStats `json:"StrikingStats"`
	ClinchStats     []ClinchStats   `json:"ClinchStats"`
	GroundStats     []GroundStats   `json:"GroundStats"`
	Fights          []Fight         `json:"Fights"`
	Url             string          `json:"Url"`
}

type SendResult struct {
	fighter FighterStats
	err     error
	retries int
}

func shouldVisitURL(url string) bool {
	return (strings.Contains(url, "espn.com/mma/fightcenter") ||
		strings.Contains(url, "espn.com/mma/fighter/")) &&
		!strings.Contains(url, "news") && !strings.Contains(url, "watch") && !strings.Contains(url, "schedule")
}

func standardizeName(name string) string {
	name = strings.ReplaceAll(name, "'", "")
	name = strings.ReplaceAll(name, "-", " ")
	words := strings.Fields(strings.ToLower(name))
	for i, word := range words {
		words[i] = strings.Title(word)
	}
	return strings.Join(words, " ")
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

func initializeCollector() *colly.Collector {
	c := colly.NewCollector(
		colly.AllowedDomains("www.espn.com", "espn.com"),
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
	c.SetProxyFunc(colly.ProxyFunc(proxySwitcher))

	// Add error handling for proxy-related issues
	c.OnError(func(r *colly.Response, err error) {
		if r.StatusCode == 407 { // Proxy Authentication Required
			log.Printf("Proxy authentication failed: %v", err)
		}
	})

	log.Printf("Successfully configured proxy")
	return c
}

func main() {
	start := time.Now() // Start the timer

	var fighterMap sync.Map // Use a concurrent map to store fighters
	var mu sync.Mutex       // Mutex to protect shared data
	var wg sync.WaitGroup

	// Replace the existing collector initialization with the new one
	c := initializeCollector()

	// Rotate user agents
	c.OnRequest(func(r *colly.Request) {
		r.Headers.Set("User-Agent", getRandomUserAgent())
	})

	c.OnHTML("a[href]", func(e *colly.HTMLElement) {
		link := e.Request.AbsoluteURL(e.Attr("href"))
		if shouldVisitURL(link) {
			wg.Add(1)
			go func(link string) {
				defer wg.Done()
				e.Request.Visit(link)
			}(link)
		}
	})

	c.OnResponse(func(r *colly.Response) {
		// Add ban/rate limit detection
		if isBannedOrRateLimited(r) {
			log.Printf("Banned or rate limited on URL: %s\n", r.Request.URL)
			time.Sleep(5 * time.Minute) // Wait for 5 minutes before retrying
			r.Request.Retry()
			return
		}

		var fighterKey string
		var stats FighterStats

		if strings.Contains(r.Request.URL.String(), "stats") {
			if shouldVisitURL(r.Request.URL.String()) {
				doc, err := html.Parse(bytes.NewReader(r.Body))
				if err != nil {
					log.Fatalf("Error parsing HTML: %v", err)
				}
				parseFighterStats(doc, &stats)

				// Store the URL
				stats.Url = r.Request.URL.String()

				if hasStrikingStatsTable(doc) {
					parseStrikingStats(doc, &stats)
				}

				if hasClinchStatsTable(doc) {
					parseClinchStats(doc, &stats)
				}

				if hasGroundStatsTable(doc) {
					parseGroundStats(doc, &stats)
				}

				fighterKey = standardizeName(stats.FirstName + " " + stats.LastName)
			}
		} else if strings.Contains(r.Request.URL.String(), "history") {
			if shouldVisitURL(r.Request.URL.String()) {
				doc, err := html.Parse(bytes.NewReader(r.Body))
				if err != nil {
					log.Fatalf("Error parsing HTML: %v", err)
				}
				parseFightHistory(doc, &stats)

				stats.Url = r.Request.URL.String()

				// Extract fighter name from URL and standardize it
				parts := strings.Split(r.Request.URL.Path, "/")
				fighterKey = standardizeName(parts[len(parts)-1])
			}
		} else if strings.Contains(r.Request.URL.String(), "bio") {
			if shouldVisitURL(r.Request.URL.String()) {
				doc, err := html.Parse(bytes.NewReader(r.Body))
				if err != nil {
					log.Fatalf("Error parsing HTML: %v", err)
				}
				parseFighterBio(doc, &stats)

				stats.Url = r.Request.URL.String()

				// Add these lines to set the fighterKey and store the bio data
				parts := strings.Split(r.Request.URL.Path, "/")
				fighterKey = standardizeName(parts[len(parts)-1])
			}
		}

		if fighterKey != "" {
			// Store or update the fighter in the map
			actual, loaded := fighterMap.LoadOrStore(fighterKey, &stats)
			if loaded {
				// If the fighter already exists, update the existing entry
				existingStats := actual.(*FighterStats)
				mu.Lock()
				if len(stats.Fights) > 0 {
					existingStats.Fights = stats.Fights
				}
				if len(stats.StrikingStats) > 0 {
					existingStats.StrikingStats = stats.StrikingStats
				}
				if len(stats.ClinchStats) > 0 {
					existingStats.ClinchStats = stats.ClinchStats
				}
				if len(stats.GroundStats) > 0 {
					existingStats.GroundStats = stats.GroundStats
				}
				// Add these lines to update bio information
				if stats.Country != "" {
					existingStats.Country = stats.Country
				}
				if stats.Reach != "" {
					existingStats.Reach = stats.Reach
				}
				if stats.Stance != "" {
					existingStats.Stance = stats.Stance
				}
				// Ensure the name is consistently formatted
				if existingStats.FirstName == "" || existingStats.LastName == "" {
					nameParts := strings.Fields(fighterKey)
					if len(nameParts) > 1 {
						existingStats.FirstName = nameParts[0]
						existingStats.LastName = strings.Join(nameParts[1:], " ")
					} else {
						existingStats.FirstName = fighterKey
					}
				}
				mu.Unlock()
			}
			fmt.Printf("Fighter Updated: %s\n", fighterKey)
		}
	})

	c.Visit("https://www.espn.com/mma/fightcenter")
	wg.Wait() // Wait for all goroutines to finish

	// After scraping is complete, convert the map to a slice
	var fighters []FighterStats
	fighterMap.Range(func(key, value interface{}) bool {
		fighter := value.(*FighterStats)
		// Only add fighters with non-empty names
		if fighter.FirstName != "" && fighter.LastName != "" {
			fighters = append(fighters, *fighter)
		} else {
			fmt.Printf("Skipping fighter with incomplete name: %s %s\n", fighter.FirstName, fighter.LastName)
		}
		return true
	})

	jsonData, err := json.MarshalIndent(fighters, "", "  ")
	if err != nil {
		log.Fatalf("Error marshaling JSON: %v", err)
	}

	err = ioutil.WriteFile("fighters.json", jsonData, 0644)
	if err != nil {
		log.Fatalf("Error writing JSON to file: %v", err)
	}

	fmt.Println("Data successfully written to fighters.json")

	sendJsonResultToDB(fighters)

	elapsed := time.Since(start)
	fmt.Printf("Execution time: %s\n", elapsed)
}

// Helper function to recursively parse HTML nodes and fill the FighterStats struct
func parseFighterStats(n *html.Node, stats *FighterStats) {
	if n.Type == html.ElementNode && n.Data == "div" {
		for _, attr := range n.Attr {
			// Find the PlayerHeader__Name class to extract the fighter's name
			if strings.Contains(attr.Val, "PlayerHeader__Main") {
				extractNameFromHeader(n, stats)
			}
		}
	}

	// Find the PlayerHeader__Bio_List to extract bio details
	if n.Type == html.ElementNode && n.Data == "ul" {
		for _, attr := range n.Attr {
			if attr.Key == "class" && strings.Contains(attr.Val, "PlayerHeader__Bio_List") {
				extractBioDetails(n, stats)
			}
		}
	}

	// Find the PlayerHeader__Right class to extract the win-loss, (T)KO, and SUB records
	if n.Type == html.ElementNode && n.Data == "div" {
		for _, attr := range n.Attr {
			if attr.Key == "class" && strings.Contains(attr.Val, "PlayerHeader__Right") {
				extractWinLossRecord(n, stats)
			}
		}
	}

	// Recursively process child nodes
	for c := n.FirstChild; c != nil; c = c.NextSibling {
		parseFighterStats(c, stats)
	}
}

func parseFighterBio(n *html.Node, stats *FighterStats) {
	// Find the wrapper div that contains all bio items
	if n.Type == html.ElementNode && n.Data == "div" {
		for _, attr := range n.Attr {
			if attr.Key == "class" && strings.Contains(attr.Val, "Wrapper Card__Content") {
				// Process each Bio__Item div
				for bioItem := n.FirstChild; bioItem != nil; bioItem = bioItem.NextSibling {
					if bioItem.Type == html.ElementNode && bioItem.Data == "div" {
						// Check if this is a Bio__Item with the exact classes
						for _, bioAttr := range bioItem.Attr {
							if bioAttr.Key == "class" && strings.Contains(bioAttr.Val, "Bio__Item n8 mb4") {
								// Find the flex div
								if flexDiv := findFirstNodeWithClass(bioItem, "div", "flex"); flexDiv != nil {
									var label, value string

									// Find the label span
									if labelSpan := findFirstNodeWithClass(flexDiv, "span", "Bio__Label ttu mr2 dib clr-gray-04"); labelSpan != nil {
										label = strings.TrimSpace(labelSpan.FirstChild.Data)
									}

									// Find the value span
									if valueSpan := findFirstNodeWithClass(flexDiv, "span", "dib flex-uniform mr3 clr-gray-01"); valueSpan != nil {
										value = strings.TrimSpace(valueSpan.FirstChild.Data)
									}

									// Update the appropriate field based on the label
									switch label {
									case "Country":
										stats.Country = value
									case "HT/WT":
										stats.HeightAndWeight = value
									case "Team":
										stats.Team = value
									case "Stance":
										stats.Stance = value
									case "Birthdate":
										stats.Birthdate = value
									case "Nickname":
										stats.Nickname = value
									case "Reach":
										stats.Reach = value
									}
								}
							}
						}
					}
				}
				return // Exit after processing the Card__Content div
			}
		}
	}

	// Recursively process child nodes if we haven't found the Card__Content div yet
	for c := n.FirstChild; c != nil; c = c.NextSibling {
		parseFighterBio(c, stats)
	}
}

// Helper function to find a node with specific tag and class
func findFirstNodeWithClass(n *html.Node, tag, class string) *html.Node {
	if n.Type == html.ElementNode && n.Data == tag {
		for _, attr := range n.Attr {
			if attr.Key == "class" && strings.Contains(attr.Val, class) {
				return n
			}
		}
	}

	for c := n.FirstChild; c != nil; c = c.NextSibling {
		if found := findFirstNodeWithClass(c, tag, class); found != nil {
			return found
		}
	}
	return nil
}

// Helper function to extract text from a node
func extractTextFromNode(n *html.Node) string {
	if n != nil && n.FirstChild != nil {
		return strings.TrimSpace(n.FirstChild.Data)
	}
	return ""
}

// Helper function to extract name from the PlayerHeader__Name class
func extractNameFromHeader(n *html.Node, stats *FighterStats) {
	if n.Type == html.ElementNode && n.Data == "span" {
		if stats.FirstName == "" {
			stats.FirstName = standardizeName(extractTextFromNode(n))
		} else if stats.LastName == "" {
			stats.LastName = standardizeName(extractTextFromNode(n))
		}
	}

	// Recursively process child nodes to find spans
	for c := n.FirstChild; c != nil; c = c.NextSibling {
		extractNameFromHeader(c, stats)
	}
}

// Helper function to extract bio details like height, weight, birthdate, team, etc.
func extractBioDetails(n *html.Node, stats *FighterStats) {
	if n.Type == html.ElementNode && n.Data == "li" {
		for c := n.FirstChild; c != nil; c = c.NextSibling {
			if c.Type == html.ElementNode && c.Data == "div" {
				switch c.FirstChild.Data {
				case "HT/WT":
					// Extract height and weight
					stats.HeightAndWeight = extractHeightWeight(c.NextSibling)
				case "Birthdate":
					// Extract birthdate
					stats.Birthdate = extractTextFromNestedDiv(c.NextSibling)
				case "Team":
					// Extract team
					stats.Team = extractTextFromNestedDiv(c.NextSibling)
				case "Nickname":
					// Extract nickname
					stats.Nickname = extractTextFromNestedDiv(c.NextSibling)
				case "Stance":
					// Extract stance
					stats.Stance = extractTextFromNestedDiv(c.NextSibling)
				}
			}
		}
	}

	// Recursively process child nodes for bio details
	for c := n.FirstChild; c != nil; c = c.NextSibling {
		extractBioDetails(c, stats)
	}
}

// Extract height and weight as a single string
func extractHeightWeight(n *html.Node) string {
	if n != nil && n.FirstChild != nil && n.FirstChild.Type == html.ElementNode && n.FirstChild.Data == "div" {
		return strings.TrimSpace(n.FirstChild.FirstChild.Data)
	}
	return ""
}

// Extract text from nested div
func extractTextFromNestedDiv(n *html.Node) string {
	if n != nil && n.FirstChild != nil && n.FirstChild.Type == html.ElementNode && n.FirstChild.Data == "div" {
		return strings.TrimSpace(n.FirstChild.FirstChild.Data)
	}
	return ""
}

// Updated helper function to extract win-loss, (T)KO, and SUB records
func extractWinLossRecord(n *html.Node, stats *FighterStats) {
	if n.Type == html.ElementNode && n.Data == "div" {
		for c := n.FirstChild; c != nil; c = c.NextSibling {
			if c.Type == html.ElementNode && c.Data == "div" {
				for _, attr := range c.Attr {
					if attr.Key == "aria-label" {
						switch attr.Val {
						case "Wins-Losses-Draws":
							stats.WinLossRecord = extractTextFromNode(c.NextSibling)
						case "Technical Knockout-Technical Knockout Losses":
							stats.TKORecord = extractTextFromNode(c.NextSibling)
						case "Submissions-Submission Losses":
							stats.SubRecord = extractTextFromNode(c.NextSibling)
						}
					}
				}
			}
		}
	}

	// Recursively process child nodes for win-loss, (T)KO, and SUB records
	for c := n.FirstChild; c != nil; c = c.NextSibling {
		extractWinLossRecord(c, stats)
	}
}

func parseStrikingStats(n *html.Node, fighter *FighterStats) {
	if n.Type == html.ElementNode && n.Data == "tbody" {
		for c := n.FirstChild; c != nil; c = c.NextSibling {
			if c.Type == html.ElementNode && c.Data == "tr" {
				var stats StrikingStats
				extractStrikingStatsFromRow(c, &stats)
				fighter.StrikingStats = append(fighter.StrikingStats, stats)
			}
		}
	}

	// Recursively process child nodes
	for c := n.FirstChild; c != nil; c = c.NextSibling {
		parseStrikingStats(c, fighter)
	}
}

func parseClinchStats(n *html.Node, fighter *FighterStats) {
	// Flag to indicate if the first table (striking stats) has been processed
	var strikingTableProcessed bool

	// Helper function to process tables
	var processTable func(*html.Node)
	processTable = func(n *html.Node) {
		if n.Type == html.ElementNode && n.Data == "tbody" {
			if strikingTableProcessed {
				// Process the clinch stats table
				for c := n.FirstChild; c != nil; c = c.NextSibling {
					if c.Type == html.ElementNode && c.Data == "tr" {
						var stats ClinchStats
						extractClinchStatsFromRow(c, &stats)
						fighter.ClinchStats = append(fighter.ClinchStats, stats)
					}
				}
			} else {
				// Mark the striking table as processed
				strikingTableProcessed = true
			}
		}

		// Recursively process child nodes
		for c := n.FirstChild; c != nil; c = c.NextSibling {
			processTable(c)
		}
	}

	// Start processing from the root node
	processTable(n)
}

func parseGroundStats(n *html.Node, fighter *FighterStats) {
	// Flags to indicate if the first and second tables have been processed
	var strikingTableProcessed, clinchTableProcessed bool

	// Helper function to process tables
	var processTable func(*html.Node)
	processTable = func(n *html.Node) {
		if n.Type == html.ElementNode && n.Data == "tbody" {
			if strikingTableProcessed && clinchTableProcessed {
				// Process the ground stats table
				for c := n.FirstChild; c != nil; c = c.NextSibling {
					if c.Type == html.ElementNode && c.Data == "tr" {
						var stats GroundStats
						extractGroundStatsFromRow(c, &stats)
						fighter.GroundStats = append(fighter.GroundStats, stats)
					}
				}
			} else if strikingTableProcessed {
				// Mark the clinch table as processed
				clinchTableProcessed = true
			} else {
				// Mark the striking table as processed
				strikingTableProcessed = true
			}
		}

		// Recursively process child nodes
		for c := n.FirstChild; c != nil; c = c.NextSibling {
			processTable(c)
		}
	}

	// Start processing from the root node
	processTable(n)
}

func extractClinchStatsFromRow(n *html.Node, stats *ClinchStats) {
	tdIndex := 0

	for c := n.FirstChild; c != nil; c = c.NextSibling {
		if c.Type == html.ElementNode && c.Data == "td" {
			text := extractTextFromNode(c)
			switch tdIndex {
			case 0:
				stats.Date = text
			case 1:
				stats.Opponent = extractTextFromNode(c.FirstChild)
			case 2:
				stats.Event = extractTextFromNode(c.FirstChild)
			case 3:
				stats.Result = extractTextFromNode(c.FirstChild)
			case 4:
				stats.SCBL = text
			case 5:
				stats.SCBA = text
			case 6:
				stats.SCHL = text
			case 7:
				stats.SCHA = text
			case 8:
				stats.SCLL = text
			case 9:
				stats.SCLA = text
			case 10:
				stats.RV = text
			case 11:
				stats.SR = text
			case 12:
				stats.TDL = text
			case 13:
				stats.TDA = text
			case 14:
				stats.TDS = text
			case 15:
				stats.TK_ACC = text
			}
			tdIndex++
		}
	}

}

// Extract table stats from row.
func extractStrikingStatsFromRow(n *html.Node, stats *StrikingStats) {
	tdIndex := 0
	for c := n.FirstChild; c != nil; c = c.NextSibling {
		if c.Type == html.ElementNode && c.Data == "td" {
			text := extractTextFromNode(c)
			switch tdIndex {
			case 0:
				stats.Date = text
			case 1:
				stats.Opponent = extractTextFromNode(c.FirstChild)
			case 2:
				stats.Event = extractTextFromNode(c.FirstChild)
			case 3:
				stats.Result = extractTextFromNode(c.FirstChild)
			case 4:
				stats.SDblA = text
			case 5:
				stats.SDhlA = text
			case 6:
				stats.SDllA = text
			case 7:
				stats.TSL = text
			case 8:
				stats.TSA = text
			case 9:
				stats.SSL = text
			case 10:
				stats.SSA = text
			case 11:
				stats.TSL_TSA = text
			case 12:
				stats.KD = text
			case 13:
				stats.PercentBody = text
			case 14:
				stats.PercentHead = text
			case 15:
				stats.PercentLeg = text
			}
			tdIndex++
		}
	}
}

func extractGroundStatsFromRow(n *html.Node, stats *GroundStats) {
	tdIndex := 0
	for c := n.FirstChild; c != nil; c = c.NextSibling {
		if c.Type == html.ElementNode && c.Data == "td" {
			text := extractTextFromNode(c)
			switch tdIndex {
			case 0:
				stats.Date = text
			case 1:
				stats.Opponent = extractTextFromNode(c.FirstChild)
			case 2:
				stats.Event = extractTextFromNode(c.FirstChild)
			case 3:
				stats.Result = extractTextFromNode(c.FirstChild)
			case 4:
				stats.SGBL = text
			case 5:
				stats.SGBA = text
			case 6:
				stats.SGHL = text
			case 7:
				stats.SGHA = text
			case 8:
				stats.SGLL = text
			case 9:
				stats.SGLA = text
			case 10:
				stats.AD = text
			case 11:
				stats.ADTB = text
			case 12:
				stats.ADHG = text
			case 13:
				stats.ADTM = text
			case 14:
				stats.ADTS = text
			case 15:
				stats.SM = text
			}
			tdIndex++
		}
	}
}

func parseFightHistory(n *html.Node, fighter *FighterStats) {
	// Check if the current node is a div with the class "ResponsiveTable fight-history"
	if n.Type == html.ElementNode && n.Data == "div" {
		for _, attr := range n.Attr {
			if attr.Key == "class" && attr.Val == "ResponsiveTable fight-history" {
				// Traverse to find the <tbody> within this div
				findAndParseTbody(n, fighter)
				return
			}
		}
	}

	if n.Type == html.ElementNode && n.Data == "ul" {
		for _, attr := range n.Attr {
			if attr.Key == "class" && strings.Contains(attr.Val, "PlayerHeader__Bio_List") {
				extractBioDetails(n, fighter)
			}
		}
	}

	// Recursively process child nodes
	for c := n.FirstChild; c != nil; c = c.NextSibling {
		parseFightHistory(c, fighter)
	}
}

func findAndParseTbody(n *html.Node, fighter *FighterStats) {
	if n.Type == html.ElementNode && n.Data == "tbody" {
		for c := n.FirstChild; c != nil; c = c.NextSibling {
			if c.Type == html.ElementNode && c.Data == "tr" {
				var fight Fight
				extractFightHistoryFromRow(c, &fight)
				fighter.Fights = append(fighter.Fights, fight)
			}
		}
		return
	}

	// Recursively process child nodes
	for c := n.FirstChild; c != nil; c = c.NextSibling {
		findAndParseTbody(c, fighter)
	}
}

func extractFightHistoryFromRow(n *html.Node, fight *Fight) {
	tdIndex := 0
	for c := n.FirstChild; c != nil; c = c.NextSibling {
		if c.Type == html.ElementNode && c.Data == "td" {
			switch tdIndex {
			case 0:
				fight.Date = extractTextFromNode(c)
			case 1:
				// Find the anchor element
				fight.Opponent = extractTextFromNode(c.FirstChild)
				if anchor := findFirstNode(c, "a"); anchor != nil {
					// Look for belt image in the entire td cell
					if img := findBeltImage(c); img != nil {
						fight.IsTitleFight = true
					}
				}
			case 2:
				fight.Result = extractTextFromNode(c.FirstChild)
			case 3:
				fight.Decision = extractTextFromNode(c.FirstChild)
			case 4:
				fight.Rnd = extractTextFromNode(c)
			case 5:
				fight.Time = extractTextFromNode(c)
			case 6:
				fight.Event = extractTextFromNode(c.FirstChild)
			}
			tdIndex++
		}
	}
}

// Helper function to find first node of a specific type
func findFirstNode(n *html.Node, data string) *html.Node {
	if n.Type == html.ElementNode && n.Data == data {
		return n
	}
	for c := n.FirstChild; c != nil; c = c.NextSibling {
		if found := findFirstNode(c, data); found != nil {
			return found
		}
	}
	return nil
}

// Helper function to check if the striking stats table is present
func hasStrikingStatsTable(n *html.Node) bool {
	if n.Type == html.ElementNode && n.Data == "div" {
		for _, attr := range n.Attr {
			if attr.Key == "class" && attr.Val == "Table__Title" {
				if n.FirstChild != nil && n.FirstChild.Type == html.TextNode && n.FirstChild.Data == "striking" {
					return true
				}
			}
		}
	}

	for c := n.FirstChild; c != nil; c = c.NextSibling {
		if hasStrikingStatsTable(c) {
			return true
		}
	}
	return false
}

func hasClinchStatsTable(n *html.Node) bool {
	if n.Type == html.ElementNode && n.Data == "div" {
		for _, attr := range n.Attr {
			if attr.Key == "class" && attr.Val == "Table__Title" {
				if n.FirstChild != nil && n.FirstChild.Type == html.TextNode && n.FirstChild.Data == "Clinch" {
					return true
				}
			}
		}
	}

	for c := n.FirstChild; c != nil; c = c.NextSibling {
		if hasClinchStatsTable(c) {
			return true
		}
	}
	return false
}

func hasGroundStatsTable(n *html.Node) bool {
	if n.Type == html.ElementNode && n.Data == "div" {
		for _, attr := range n.Attr {
			if attr.Key == "class" && attr.Val == "Table__Title" {
				if n.FirstChild != nil && n.FirstChild.Type == html.TextNode && n.FirstChild.Data == "Ground" {
					return true
				}
			}
		}
	}

	for c := n.FirstChild; c != nil; c = c.NextSibling {
		if hasGroundStatsTable(c) {
			return true
		}
	}
	return false
}

func getRandomUserAgent() string {
	return userAgents[rand.Intn(len(userAgents))]
}

func isBannedOrRateLimited(r *colly.Response) bool {
	// Check for common ban/rate limit status codes
	if r.StatusCode == 429 || r.StatusCode == 403 {
		return true
	}

	return false
}

func sendJsonResultToDB(fighters []FighterStats) {
	fmt.Println("Sending fighters to DB")
	const (
		maxRetries   = 3
		workerCount  = 3
		delayBetween = 2 * time.Second
		retryDelay   = 30 * time.Second
	)

	queue := make(chan FighterStats, len(fighters))
	results := make(chan SendResult, len(fighters))
	var wg sync.WaitGroup

	// Start workers
	for i := 0; i < workerCount; i++ {
		wg.Add(1)
		go func() {
			defer wg.Done()
			for fighter := range queue {
				result := sendFighter(fighter, maxRetries, retryDelay)
				results <- result
				time.Sleep(delayBetween) // Delay between requests
			}
		}()
	}

	// Send fighters to queue
	for _, fighter := range fighters {
		queue <- fighter
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
			log.Printf("Failed to send fighter %s %s after %d retries: %v",
				result.fighter.FirstName,
				result.fighter.LastName,
				result.retries,
				result.err)
			failed = append(failed, result)
		} else {
			log.Printf("Successfully sent fighter %s %s %s",
				result.fighter.FirstName,
				result.fighter.LastName,
				result.fighter.Url)
		}
	}

	// Handle failed requests
	if len(failed) > 0 {
		log.Printf("Failed to send %d fighters. Writing to file...", len(failed))
		saveFailedToFile(failed)
	}
}

func sendFighter(fighter FighterStats, maxRetries int, retryDelay time.Duration) SendResult {
	url := os.Getenv("SCRAPER_SERVICE_URL") + "/api/fighters"
	client := &http.Client{
		Timeout: 30 * time.Second,
	}

	retries := 0
	for retries < maxRetries {

		fighterArray := []FighterStats{fighter}

		fighterData, err := json.Marshal(fighterArray)
		if err != nil {
			return SendResult{fighter, err, retries}
		}

		req, err := http.NewRequest("POST", url, bytes.NewBuffer(fighterData))
		if err != nil {
			return SendResult{fighter, err, retries}
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

		return SendResult{fighter, nil, retries}
	}

	return SendResult{fighter, fmt.Errorf("max retries reached"), retries}
}

func saveFailedToFile(failed []SendResult) {
	timestamp := time.Now().Format("2006-01-02_15-04-05")
	filename := fmt.Sprintf("failed_fighters_%s.json", timestamp)

	fighters := make([]FighterStats, len(failed))
	for i, result := range failed {
		fighters[i] = result.fighter
	}

	data, err := json.MarshalIndent(fighters, "", "  ")
	if err != nil {
		log.Printf("Error marshaling failed fighters: %v", err)
		return
	}

	err = ioutil.WriteFile(filename, data, 0644)
	if err != nil {
		log.Printf("Error writing failed fighters to file: %v", err)
		return
	}

	log.Printf("Failed fighters written to %s", filename)
}

// Add a new helper function to find belt images
func findBeltImage(n *html.Node) *html.Node {
	if n.Type == html.ElementNode && n.Data == "img" {
		for _, attr := range n.Attr {
			if attr.Key == "src" && strings.Contains(strings.ToLower(attr.Val), "belt") {
				return n
			}
		}
	}

	for c := n.FirstChild; c != nil; c = c.NextSibling {
		if found := findBeltImage(c); found != nil {
			return found
		}
	}
	return nil
}
