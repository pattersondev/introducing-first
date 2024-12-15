package db

import (
	"context"
	"database/sql"
	"fmt"
	"log"
	"os"
	"sync"
	"time"

	_ "github.com/lib/pq"
)

var usersDb *sql.DB
var (
	pickAttempts = make(map[string]time.Time)
	pickMutex    sync.Mutex
	rateLimit    = 2 * time.Second
)

type Pick struct {
	PickID             int    `json:"pick_id"`
	UserID             int    `json:"user_id"`
	MatchupID          string `json:"matchup_id"`
	EventID            string `json:"event_id"`
	SelectionFighterID string `json:"selection_fighter_id"`
	PickResult         string `json:"pick_result"`
	CreatedAt          string `json:"created_at"`
	UpdatedAt          string `json:"updated_at"`
}

func StartUsersDbConnection() *sql.DB {
	connStr := os.Getenv("USERS_CONNECTION_STRING")

	var err error
	usersDb, err = sql.Open("postgres", connStr)
	if err != nil {
		log.Fatalf("Error opening database connection: %v", err)
	}

	err = usersDb.Ping()
	if err != nil {
		log.Fatalf("Error pinging database: %v", err)
	}

	return usersDb
}

// SelectPick and InsertPick seperate functions not used yet, but to be useful later as boilerplate for advanced picks (picks other than Money Line)
func SelectPick(user_id string, matchup_id string, event_id string, selection_fighter_id string) (string, error) {
	var pickId string
	sqlStatement := "SELECT pick_id FROM public.picks WHERE matchup_id = $1 AND event_id = $2 AND selection_fighter_id = $3 AND user_id = $4;"
	err := usersDb.QueryRow(sqlStatement, matchup_id, event_id, selection_fighter_id, user_id).Scan(&pickId)
	if err != nil {
		return "", fmt.Errorf("unable to retrieve pick with provided userid and other inputs %s: %w", user_id, err)
	}
	return pickId, nil
}
func InsertPick(user_id string, matchup_id string, event_id string, selection_fighter_id string) error {
	sqlStatement := "INSERT INTO public.picks (user_id, matchup_id, event_id, selection_fighter_id) VALUES ($1, $2, $3, $4);"
	//sqlStatement := "INSERT INTO public.picks (user_id, matchup_id, event_id, selection_fighter_id) VALUES ($1, $2, $3, $4);"

	_, err := usersDb.ExecContext(context.Background(), sqlStatement, user_id, matchup_id, event_id, selection_fighter_id)
	if err != nil {
		return fmt.Errorf("Unable to insert pick for user with user_id of %s: %w", user_id, err)
	}

	return nil
}

func GetPicksForUserAndEvent(userID int, eventID string) ([]Pick, error) {
	sqlStatement := "SELECT pick_id, user_id, matchup_id, event_id, selection_fighter_id, pick_result, created_at, updated_at FROM public.picks WHERE user_id = $1 AND event_id = $2;"

	rows, err := usersDb.Query(sqlStatement, userID, eventID)
	if err != nil {
		return nil, fmt.Errorf("error querying picks for user %d and event %s: %w", userID, eventID, err)
	}
	defer rows.Close()

	var picks []Pick
	for rows.Next() {
		var pick Pick
		err := rows.Scan(
			&pick.PickID,
			&pick.UserID,
			&pick.MatchupID,
			&pick.EventID,
			&pick.SelectionFighterID,
			&pick.PickResult,
			&pick.CreatedAt,
			&pick.UpdatedAt,
		)
		if err != nil {
			return nil, fmt.Errorf("error scanning pick row: %w", err)
		}
		picks = append(picks, pick)
	}

	return picks, nil
}

func GetPicksForEvent(eventID string) ([]Pick, error) {
	sqlStatement := "SELECT pick_id, user_id, matchup_id, event_id, selection_fighter_id, pick_result, created_at, updated_at FROM public.picks WHERE event_id = $1;"

	rows, err := usersDb.Query(sqlStatement, eventID)
	if err != nil {
		return nil, fmt.Errorf("error querying picks for event %s: %w", eventID, err)
	}
	defer rows.Close()

	var picks []Pick
	for rows.Next() {
		var pick Pick
		err := rows.Scan(
			&pick.PickID,
			&pick.UserID,
			&pick.MatchupID,
			&pick.EventID,
			&pick.SelectionFighterID,
			&pick.PickResult,
			&pick.CreatedAt,
			&pick.UpdatedAt,
		)
		if err != nil {
			return nil, fmt.Errorf("error scanning pick row: %w", err)
		}
		picks = append(picks, pick)
	}

	return picks, nil
}

func GetPicksForMatchup(matchupID string) ([]Pick, error) {
	sqlStatement := "SELECT pick_id, user_id, matchup_id, event_id, selection_fighter_id, pick_result, created_at, updated_at FROM public.picks WHERE matchup_id = $1;"

	rows, err := usersDb.Query(sqlStatement, matchupID)
	if err != nil {
		return nil, fmt.Errorf("error querying picks for matchup %s: %w", matchupID, err)
	}
	defer rows.Close()

	var picks []Pick
	for rows.Next() {
		var pick Pick
		err := rows.Scan(
			&pick.PickID,
			&pick.UserID,
			&pick.MatchupID,
			&pick.EventID,
			&pick.SelectionFighterID,
			&pick.PickResult,
			&pick.CreatedAt,
			&pick.UpdatedAt,
		)
		if err != nil {
			return nil, fmt.Errorf("error scanning pick row: %w", err)
		}
		picks = append(picks, pick)
	}

	return picks, nil
}

// insert or update pick (to handle if someone switches their pick)
func UpsertPick(user_id string, matchup_id string, event_id string, selection_fighter_id string) error {
	// Rate limiting check
	pickMutex.Lock()
	key := fmt.Sprintf("%s:%s:%s", user_id, matchup_id, event_id)
	lastAttempt, exists := pickAttempts[key]
	now := time.Now()

	if exists {
		timeRemaining := rateLimit - now.Sub(lastAttempt)
		if timeRemaining > 0 {
			pickMutex.Unlock()
			log.Printf("Rate limit hit - Time remaining: %.1f seconds", timeRemaining.Seconds())
			return fmt.Errorf("rate limit exceeded: please wait %.1f seconds before updating your pick again", timeRemaining.Seconds())
		}
	}

	pickAttempts[key] = now
	pickMutex.Unlock()

	// Add debug logging
	log.Printf("Checking for existing pick...")

	//check if the pick already exists
	sqlCheck := "SELECT pick_id FROM public.picks WHERE user_id = $1 AND matchup_id = $2 AND event_id = $3;"
	var pickId string
	err := usersDb.QueryRow(sqlCheck, user_id, matchup_id, event_id).Scan(&pickId)

	if err != nil {
		if err == sql.ErrNoRows {
			log.Printf("No existing pick found, inserting new pick...")
			//if no existing pick, insert a new one
			sqlInsert := "INSERT INTO public.picks (user_id, matchup_id, event_id, selection_fighter_id) VALUES ($1, $2, $3, $4);"
			_, err := usersDb.ExecContext(context.Background(), sqlInsert, user_id, matchup_id, event_id, selection_fighter_id)
			if err != nil {
				log.Printf("Error inserting pick: %v", err)
				return fmt.Errorf("unable to insert pick: %w", err)
			}
		} else {
			log.Printf("Error checking for existing pick: %v", err)
			return fmt.Errorf("error checking for existing pick: %w", err)
		}
	} else {
		log.Printf("Existing pick found, updating pick...")
		//if a pick exists, update the selection
		sqlUpdate := "UPDATE public.picks SET selection_fighter_id = $1, updated_at = CURRENT_TIMESTAMP WHERE pick_id = $2;"
		_, err := usersDb.ExecContext(context.Background(), sqlUpdate, selection_fighter_id, pickId)
		if err != nil {
			log.Printf("Error updating pick: %v", err)
			return fmt.Errorf("unable to update pick: %w", err)
		}
	}

	return nil
}

func UpdateMatchupPickResults(winning_fighter_id string, event_id string, matchup_id string) error {
	// First, query all pending picks for this matchup
	sqlSelect := "SELECT pick_id, selection_fighter_id FROM public.picks WHERE pick_result = 'pending' AND matchup_id = $1 AND event_id = $2;"

	rows, err := usersDb.Query(sqlSelect, matchup_id, event_id)
	if err != nil {
		return fmt.Errorf("error querying pending picks: %w", err)
	}
	defer rows.Close()

	// Process each pick
	for rows.Next() {
		var pickID int
		var selectionFighterID string

		err := rows.Scan(&pickID, &selectionFighterID)
		if err != nil {
			return fmt.Errorf("error scanning pick row: %w", err)
		}

		// Determine if the pick was correct
		var result string
		if selectionFighterID == winning_fighter_id {
			result = "correct"
		} else {
			result = "incorrect"
		}

		// Update the pick result
		sqlUpdate := "UPDATE public.picks SET pick_result = $1, updated_at = CURRENT_TIMESTAMP WHERE pick_id = $2;"
		_, err = usersDb.Exec(sqlUpdate, result, pickID)
		if err != nil {
			return fmt.Errorf("error updating pick result for pick_id %d: %w", pickID, err)
		}
	}

	if err = rows.Err(); err != nil {
		return fmt.Errorf("error iterating over picks: %w", err)
	}

	return nil
}

func init() {
	// Clean up old rate limit entries every hour
	go func() {
		for {
			time.Sleep(1 * time.Hour)
			pickMutex.Lock()
			now := time.Now()
			for key, timestamp := range pickAttempts {
				if now.Sub(timestamp) > 24*time.Hour {
					delete(pickAttempts, key)
				}
			}
			pickMutex.Unlock()
		}
	}()
}
